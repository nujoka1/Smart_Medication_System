#!/bin/bash
# Activate environment
source ~/pilldispenser/venv/bin/activate

# Install pigpio (needed for precise servo PWM)
sudo apt update
sudo apt install -y pigpio python3-pigpio
sudo systemctl enable pigpiod
sudo systemctl start pigpiod

# Install Python packages
pip install ultralytics==8.3.* \
            flask==3.1.* \
            flask-socketio==5.4.* \
            sqlalchemy==2.0.* \
            mfrc522==0.0.7 \
            smbus2==0.5.* \
            RPi.GPIO \
            --break-system-packages

# Test database init
cd ~/pilldispenser
python3 src/core/database.py
