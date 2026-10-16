# Image Star Mark Remover

This tool automatically detects and removes the small "star" watermark (common in AI-generated artwork) from the bottom-right corner of images.

## Features

- **Automatic Detection**: Scans the bottom-right region for bright star patterns.
- **Intelligent Inpainting**: Uses OpenCV's inpainting algorithm to fill the area with surrounding pixels seamlessly.
- **Batch Processing**: Clean individual files or whole directories.

## Setup

1. Make sure you have Python installed.
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Process a single image

```bash
python cleaner.py my_image.png
```

### Process an entire directory

```bash
python cleaner.py path/to/images --output path/to/cleaned
```

## How It Works

1. The script isolates a region in the bottom-right (about 15% of the image's dimensions).
2. It converts this ROI to grayscale and applies a threshold to find the brightest pixels (the white star).
3. It performs contour analysis to confirm the shape and size matches a watermark star.
4. It creates a mask and uses `cv2.inpaint` to remove the mark based on the surrounding pixels.
