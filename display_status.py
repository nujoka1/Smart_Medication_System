#!/usr/bin/env python3
"""MedSystem Display - Direct framebuffer"""
from PIL import Image, ImageDraw, ImageFont
import struct
import time

class MedSystemDisplay:
    def __init__(self, fb_device="/dev/fb0", width=480, height=320):
        self.fb = open(fb_device, 'wb')
        self.width = width
        self.height = height
    
    def write_image(self, image):
        rgb_image = image.convert('RGB')
        pixels = rgb_image.tobytes('raw', 'RGB')
        rgb565_data = b''
        for i in range(0, len(pixels), 3):
            r, g, b = pixels[i], pixels[i+1], pixels[i+2]
            rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            rgb565_data += struct.pack('<H', rgb565)
        self.fb.seek(0)
        self.fb.write(rgb565_data)
        self.fb.flush()
    
    def show_status(self, title, text, color=(0, 255, 0)):
        image = Image.new('RGB', (self.width, self.height), (30, 30, 50))
        draw = ImageDraw.Draw(image)
        try:
            font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            font_big = font_small = ImageFont.load_default()
        draw.text((10, 20), title, fill=(255,255,255), font=font_big)
        draw.text((10, 100), text, fill=color, font=font_small)
        self.write_image(image)
    
    def close(self):
        self.fb.close()

display = MedSystemDisplay()
display.show_status("MedSystem", "Ready")
display.close()
