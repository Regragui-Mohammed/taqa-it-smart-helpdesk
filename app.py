"""
TAQA IT Smart Helpdesk - Modern React + Flask Application Entry Point
Note: The old Streamlit interface has been superseded by the Modern React + Vite Frontend.
Running this file launches the Flask REST API Server for the React Frontend.
"""

import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" ⚡ TAQA IT Smart Helpdesk — Modern React Architecture")
    print("=" * 60)
    print(" Starting Flask REST API Backend on http://localhost:5000...")
    print(" To view the React UI, open a second terminal and run:")
    print("   cd frontend")
    print("   npm run dev")
    print("   -> http://localhost:5173")
    print("=" * 60 + "\n")

    # Delegate to modern server.py
    import server
    server.app.run(debug=True, port=5000)
