#!/usr/bin/env python3
"""MedSystem Display - Live Framebuffer Dashboard"""
from PIL import Image, ImageDraw, ImageFont
import struct, time

class MedSystemDisplay:
    def __init__(self, fb_device="/dev/fb0", width=480, height=320):
        self.fb = open(fb_device, 'r+b')
        self.width, self.height = width, height
        self.running = True
        try:
            self.font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
            self.font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            self.font_big = self.font_small = ImageFont.load_default()
    
    def write_image(self, image):
        rgb = image.convert('RGB')
        pixels = rgb.tobytes()
        rgb565 = bytearray()
        for i in range(0, len(pixels), 3):
            r, g, b = pixels[i], pixels[i+1], pixels[i+2]
            px = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            rgb565 += struct.pack('<H', px)
        self.fb.seek(0)
        self.fb.write(rgb565)
        self.fb.flush()
    
    def render_screen(self, title, text, color=(0, 255, 0)):
        img = Image.new('RGB', (self.width, self.height), (25, 25, 40))
        draw = ImageDraw.Draw(img)
        draw.text((20, 20), title, fill=(255, 255, 255), font=self.font_big)
        draw.text((20, 120), text, fill=color, font=self.font_small)
        self.write_image(img)
    
    def run_dashboard(self):
        try:
            counter = 0
            while self.running:
                status_text = f"System Active | Tick {counter}"
                self.render_screen("MedSystem", status_text, (0, 255, 80))
                counter += 1
                time.sleep(1)
        except KeyboardInterrupt:
            self.shutdown()
    
    def shutdown(self):
        self.running = False
        try:
            self.fb.close()
        except:
            pass

if __name__ == "__main__":
    display = MedSystemDisplay()
    display.run_dashboard()
