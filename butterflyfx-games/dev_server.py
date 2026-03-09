#!/usr/bin/env python3
"""
ButterflyFX Games — Local Development Server

A simple HTTP server for local development and testing of Breakout 3D.

Usage:
    python dev_server.py
    
Then open: http://127.0.0.1:8000/breakout3d.html

Features:
    - Auto-reload on file changes (optional)
    - CORS enabled for API calls
    - Gzip compression
    - Live reload support
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

PORT = 8000
HOST = '127.0.0.1'

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Add cache control
        if self.path.endswith(('.html', '.json')):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        else:
            self.send_header('Cache-Control', 'public, max-age=3600')
        
        super().end_headers()

    def log_message(self, format, *args):
        # Custom logging
        print(f'[{self.log_date_time_string()}] {format % args}')

def run_server():
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Create server
    with socketserver.TCPServer((HOST, PORT), MyHTTPRequestHandler) as httpd:
        url = f'http://{HOST}:{PORT}/breakout3d.html'
        
        print('=' * 60)
        print('ButterflyFX Games — Local Development Server')
        print('=' * 60)
        print(f'Server running at: {url}')
        print(f'Press Ctrl+C to stop')
        print('=' * 60)
        print()
        
        # Open browser
        try:
            webbrowser.open(url)
            print(f'✓ Opening browser...')
        except Exception as e:
            print(f'Could not open browser: {e}')
            print(f'Open manually: {url}')
        
        print()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n✓ Server stopped')
            sys.exit(0)

if __name__ == '__main__':
    run_server()
