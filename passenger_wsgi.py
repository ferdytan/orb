import os
import sys
import traceback

# Ensure the repository root directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

_wsgi_app = None
_init_error = None

def get_wsgi_app():
    """Lazily instantiates ASGIMiddleware inside the worker process to prevent thread deadlocks after fork."""
    global _wsgi_app, _init_error
    if _init_error is not None:
        raise _init_error
    if _wsgi_app is None:
        try:
            from a2wsgi import ASGIMiddleware
            from backend.app import app
            _wsgi_app = ASGIMiddleware(app)
        except Exception as e:
            _init_error = e
            raise
    return _wsgi_app

def application(environ, start_response):
    """Phusion Passenger WSGI entry point."""
    try:
        app_callable = get_wsgi_app()
        return app_callable(environ, start_response)
    except Exception as e:
        error_trace = traceback.format_exc()
        status = "500 Internal Server Error"
        response_headers = [("Content-Type", "text/plain; charset=utf-8")]
        start_response(status, response_headers)
        return [f"Orb Backend WSGI Error:\n\n{error_trace}".encode("utf-8")]
