import os
import sys

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Phusion Passenger on cPanel uses WSGI.
# We wrap FastAPI (ASGI) with a2wsgi so cPanel can run FastAPI seamlessly.
try:
    from a2wsgi import ASGIMiddleware
    from backend.app import app
    application = ASGIMiddleware(app)
except ImportError:
    # If a2wsgi is not yet installed in the virtualenv
    def application(environ, start_response):
        status = '200 OK'
        output = b'''
        <!DOCTYPE html>
        <html>
        <head><title>Orb - Python Setup</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>Orb Virtual Office Backend</h2>
            <p>Passenger is running, but <code>a2wsgi</code> is needed to run FastAPI (ASGI) on cPanel.</p>
            <p>Please run in your cPanel Terminal or virtualenv:</p>
            <pre style="background: #eee; display: inline-block; padding: 10px 20px; border-radius: 8px;">pip install a2wsgi fastapi uvicorn crewai</pre>
        </body>
        </html>
        '''
        response_headers = [('Content-type', 'text/html'), ('Content-Length', str(len(output)))]
        start_response(status, response_headers)
        return [output]
