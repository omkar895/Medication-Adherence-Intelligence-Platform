import sys
import os

# Add project root directory to sys.path so 'backend' is recognized
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
