from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-change-me')
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    
    # Enable CORS
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    CORS(app, resources={
        r"/api/*": {
            "origins": [frontend_url, "http://localhost:3000", "http://localhost:5173"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    @app.get('/api/health')
    def health():
        return {'status': 'ok'}
    
    # Register blueprints
    from app.routes import auth_routes, email_routes
    app.register_blueprint(auth_routes.auth_bp)
    app.register_blueprint(email_routes.email_bp)
    
    return app
