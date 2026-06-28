#!/usr/bin/env python3
"""PillDetector - Mock (real TFLite later when env is stable)"""
import random

class PillDetector:
    def __init__(self, model_path=None):
        self.pills = ["Aspirin 500mg", "Ibuprofen 400mg", "Metformin 500mg"]
        print("✓ Mock detector ready (real model later)")
    
    def detect(self, image_path):
        pill = random.choice(self.pills)
        conf = random.uniform(0.85, 0.98)
        print(f"✓ Detected: {pill} ({conf:.1%})")
        return {'class': pill, 'confidence': conf}

if __name__ == "__main__":
    d = PillDetector()
    d.detect("/tmp/test.jpg")

