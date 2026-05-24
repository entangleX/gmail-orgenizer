"""Authentication routes for OAuth 2.0 flow."""

from flask import Blueprint, request, jsonify, session
from app.services.gmail_service import GmailService

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
gmail_service = GmailService()

@auth_bp.route('/login', methods=['GET'])
def login():
    """Get the authorization URL and state for OAuth login."""
    try:
        access_type = request.args.get('access', 'gmail')
        if access_type not in ['profile', 'gmail', 'actions']:
            return jsonify({'error': 'Invalid access type'}), 400

        auth_url, state = gmail_service.get_authorization_url(access_type)
        session['oauth_state'] = state
        session['oauth_access_type'] = access_type
        session.permanent = True

        return jsonify({
            'auth_url': auth_url,
            'state': state,
            'access_type': access_type
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/callback', methods=['GET', 'POST'])
def callback():
    """Handle the OAuth callback from Google."""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return jsonify({'error': error}), 400
    
    if not code:
        return jsonify({'error': 'No authorization code provided'}), 400
    
    # The frontend also verifies state before calling this endpoint. If the
    # browser preserved the Flask session cookie, verify it here too.
    stored_state = session.get('oauth_state')
    if stored_state and state != stored_state:
        return jsonify({'error': 'State mismatch - potential CSRF attack'}), 400
    
    try:
        access_type = session.get('oauth_access_type', request.args.get('access', 'gmail'))
        # Exchange code for credentials
        credentials = gmail_service.get_credentials_from_code(code, access_type)
        creds_dict = gmail_service.credentials_to_dict(credentials)
        profile = gmail_service.get_user_profile(credentials)
        
        session.pop('oauth_state', None)
        session.pop('oauth_access_type', None)
        
        return jsonify({
            'success': True,
            'message': 'Authentication successful',
            'access_type': access_type,
            'user': profile,
            'credentials': creds_dict if access_type in ['gmail', 'actions'] else None
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Refresh the credentials if expired."""
    data = request.json
    creds_dict = data.get('credentials')
    
    if not creds_dict:
        return jsonify({'error': 'No credentials provided'}), 400
    
    try:
        credentials = gmail_service.dict_to_credentials(creds_dict)
        service = gmail_service.get_gmail_service(credentials)
        
        if not service:
            return jsonify({'error': 'Failed to refresh credentials'}), 500
        
        updated_creds_dict = gmail_service.credentials_to_dict(credentials)
        return jsonify({
            'success': True,
            'credentials': updated_creds_dict
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Clear the session (logout)."""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})
