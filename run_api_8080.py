#!/usr/bin/env python3
from src.api.routes import app, socketio
# Register V2 production mutation endpoints while preserving V1/TFT compatibility.
import src.api.v2_mutations  # noqa: F401,E402

socketio.run(
    app,
    host="0.0.0.0",
    port=8080,
    debug=False,
    use_reloader=False,
    allow_unsafe_werkzeug=True
)
