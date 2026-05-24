#!/usr/bin/env python3
"""Main entry point for the Flask backend."""

import os
from dotenv import load_dotenv
from app import create_app

# Load environment variables
load_dotenv()

# Create Flask app
app = create_app()

if __name__ == '__main__':
    # Development server
    port = int(os.getenv('PORT', os.getenv('FLASK_PORT', 5001)))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.getenv('FLASK_ENV') == 'development'
    )
