#!/usr/bin/env python3
from src.api.routes import app, socketio

socketio.run(
    app,
    host="0.0.0.0",
    port=8080,
    debug=False,
    use_reloader=False,
    allow_unsafe_werkzeug=True
)
