#!/bin/bash
# ButterflyFX Games — Local Development Server (macOS/Linux)
#
# Usage: bash run_dev_server.sh
#
# This script starts a local HTTP server for development and testing.
# The game will open automatically in your default browser.

echo ""
echo "============================================================"
echo "ButterflyFX Games - Local Development Server"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.7+ from https://www.python.org/"
    exit 1
fi

# Run the dev server
python3 dev_server.py
