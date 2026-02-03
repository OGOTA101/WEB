
import os
from PIL import Image
import math

def make_transparent(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        
        # 左上のピクセルを背景色の基準とする
        bg_pixel = datas[0]
        bg_r, bg_g, bg_b, _ = bg_pixel
        
        # 許容範囲（色のズレ）
        tolerance = 30
        
        for item in datas:
            r, g, b, a = item
            
            # 背景色（左上の色）に近いか判定
            diff_bg = math.sqrt((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)
            
            # 黒色 (0,0,0) に近いか判定 (背景が黒の場合の保険)
            diff_black = math.sqrt((r - 0)**2 + (g - 0)**2 + (b - 0)**2)
            
            # 背景色または黒に近いなら透明にする
            if diff_bg < tolerance or diff_black < 50:
                newData.append((r, g, b, 0))  # 完全透明
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(image_path, "PNG")
        print(f"Processed: {image_path}")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.png'):
                make_transparent(os.path.join(root, file))

# assetsフォルダを処理
process_directory(r"c:\Users\ihogo\Desktop\WEB\deepsea-firebase\assets")
