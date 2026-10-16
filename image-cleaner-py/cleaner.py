import os
import cv2
import numpy as np
from pathlib import Path
import argparse

def remove_star_mark(input_path, output_path):
    # Load image
    img = cv2.imread(str(input_path))
    if img is None:
        print(f"Error: Could not read image at {input_path}")
        return False

    h, w = img.shape[:2]

    # Region of Interest (ROI) - Bottom Right Corner (roughly 150x150 or relative to size)
    # The mark is usually in the very bottom right area.
    roi_size_w = int(w * 0.15)
    roi_size_h = int(h * 0.15)
    
    # Ensure ROI is at least some size if image is small, but cap it
    roi_size_w = max(min(roi_size_w, 200), 100)
    roi_size_h = max(min(roi_size_h, 200), 100)

    # Coordinates for ROI
    y1, y2 = h - roi_size_h, h
    x1, x2 = w - roi_size_w, w
    
    # High-pass filter to isolate sharp features (like the watermark) from smooth backgrounds
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray_roi, (0, 0), 10)
    
    # We want bright features, so gray - blurred
    diff = cv2.subtract(gray_roi, blurred)
    
    # Threshold to find significant sharp bright features
    # Even a faint transparent white star will leave an edge in the high-pass diff
    _, mask_roi = cv2.threshold(diff, 10, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(mask_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    best_cnt = None
    best_score = -999999
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 10 < area < (roi_size_w * roi_size_h * 0.25):
            x, y, cw, ch = cv2.boundingRect(cnt)
            aspect_ratio = max(cw / (ch + 1e-5), ch / (cw + 1e-5))
            
            # The star is somewhat symmetrical, reject extreme lines
            if aspect_ratio < 4.0:
                # Calculate distance from the exact bottom-right corner of the ROI
                cx = x + cw / 2
                cy = y + ch / 2
                dist_to_br = ((roi_size_w - cx) ** 2 + (roi_size_h - cy) ** 2) ** 0.5
                
                # We strongly prioritize features that are extremely close to the corner
                score = -dist_to_br
                if score > best_score:
                    best_score = score
                    best_cnt = cnt
                    
    final_mask_roi = np.zeros_like(mask_roi)
    found = False
    
    if best_cnt is not None:
        # Instead of just the thin star lines, use convex hull to enclose the entire shape
        hull = cv2.convexHull(best_cnt)
        cv2.drawContours(final_mask_roi, [hull], -1, 255, -1)
        
        # Dilate aggressively to cover the soft, semi-transparent edges of the glow perfectly
        # Without this, a ghost ring of the transparent glow might remain.
        kernel_dilate = np.ones((15, 15), np.uint8)
        final_mask_roi = cv2.dilate(final_mask_roi, kernel_dilate, iterations=1)
        found = True

    if not found:
        # Absolute fallback: forcefully mask the typical watermark location if detection somehow fails
        # Assuming typical padding is ~10-20px from corner, and watermark is ~40x40px
        # We will mask a 60x60 square in the bottom right corner
        bw = min(60, roi_size_w)
        bh = min(60, roi_size_h)
        cv2.rectangle(final_mask_roi, (roi_size_w - bw, roi_size_h - bh), (roi_size_w, roi_size_h), 255, -1)

    # Create full mask for the whole image
    full_mask = np.zeros((h, w), dtype=np.uint8)
    full_mask[y1:y2, x1:x2] = final_mask_roi

    # Perform Inpainting
    # INPAINT_TELEA is generally good for small artifacts
    cleaned_img = cv2.inpaint(img, full_mask, 3, cv2.INPAINT_TELEA)

    # Save output
    cv2.imwrite(str(output_path), cleaned_img)
    return True

def main():
    parser = argparse.ArgumentParser(description="Remove star marks from bottom right of images.")
    parser.add_argument("input", help="Input image file or directory")
    parser.add_argument("--output", "-o", help="Output directory (default: ./cleaned)", default="cleaned")
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    output_dir = Path(args.output)
    
    if not output_dir.exists():
        output_dir.mkdir(parents=True)
        
    if input_path.is_file():
        files = [input_path]
    elif input_path.is_dir():
        # Get all image files
        extensions = [".jpg", ".jpeg", ".png", ".webp"]
        files = [f for f in input_path.iterdir() if f.suffix.lower() in extensions]
    else:
        print(f"Error: {input_path} is not a valid file or directory.")
        return

    print(f"Processing {len(files)} files...")
    success_count = 0
    for f in files:
        out_f = output_dir / f.name
        print(f"Cleaning: {f.name} -> {out_f.name}")
        if remove_star_mark(f, out_f):
            success_count += 1
            
    print(f"Done! Successfully processed {success_count}/{len(files)} images.")

if __name__ == "__main__":
    main()
