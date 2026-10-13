import os
import sys

# Ensure the repository root directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Phusion Passenger on cPanel expects a WSGI callable named `application`.
# Wrap the FastAPI ASGI application with a2wsgi's ASGIMiddleware.
from a2wsgi import ASGIMiddleware
from backend.app import app

application = ASGIMiddleware(app)
