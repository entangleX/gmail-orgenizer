"""Gmail API Service for handling email operations."""

import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime

PROFILE_SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']
GMAIL_METADATA_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.metadata',
]
GMAIL_ACTION_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.metadata',
    'https://www.googleapis.com/auth/gmail.modify',
]

class GmailService:
    def __init__(self):
        self.profile_scopes = PROFILE_SCOPES
        self.gmail_scopes = GMAIL_METADATA_SCOPES
        self.action_scopes = GMAIL_ACTION_SCOPES
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        self.redirect_uri = os.getenv(
            'FRONTEND_CALLBACK_URL',
            f"{self.frontend_url}/api/auth/callback"
        )
    
    def get_scopes(self, access_type='gmail'):
        """Return OAuth scopes for the requested access tier."""
        if access_type == 'profile':
            return self.profile_scopes
        if access_type == 'actions':
            return self.action_scopes
        return self.gmail_scopes

    def get_auth_flow(self, access_type='gmail'):
        """Initialize the OAuth 2.0 flow."""
        if not self.client_id or not self.client_secret:
            raise ValueError('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured')

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.get_scopes(access_type)
        )
        flow.redirect_uri = self.redirect_uri
        return flow
    
    def get_authorization_url(self, access_type='gmail'):
        """Get the authorization URL for user consent."""
        flow = self.get_auth_flow(access_type)
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent' if access_type in ['gmail', 'actions'] else 'select_account'
        )
        return auth_url, state
    
    def get_credentials_from_code(self, code, access_type='gmail'):
        """Exchange authorization code for credentials."""
        flow = self.get_auth_flow(access_type)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        return credentials
    
    def credentials_to_dict(self, credentials):
        """Convert credentials object to a browser-safe dictionary."""
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id or self.client_id,
            'scopes': credentials.scopes,
            'expiry': credentials.expiry.isoformat() if credentials.expiry else None,
        }

    def get_user_profile(self, credentials):
        """Verify and extract basic profile claims from the ID token."""
        if not credentials.id_token:
            return None

        claims = id_token.verify_oauth2_token(
            credentials.id_token,
            Request(),
            self.client_id
        )
        return {
            'email': claims.get('email'),
            'name': claims.get('name'),
            'picture': claims.get('picture'),
            'email_verified': claims.get('email_verified', False),
        }
    
    def dict_to_credentials(self, creds_dict):
        """Convert credentials dictionary back to Credentials object."""
        credentials = Credentials(
            token=creds_dict.get('token'),
            refresh_token=creds_dict.get('refresh_token'),
            token_uri=creds_dict.get('token_uri'),
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=creds_dict.get('scopes')
        )
        expiry = creds_dict.get('expiry')
        if expiry:
            credentials.expiry = datetime.fromisoformat(expiry)
        return credentials
    
    def get_gmail_service(self, credentials):
        """Build and return the Gmail API service."""
        if isinstance(credentials, dict):
            credentials = self.dict_to_credentials(credentials)
        
        try:
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
        except RefreshError:
            return None
        
        service = build('gmail', 'v1', credentials=credentials)
        return service
    
    def fetch_messages(self, service, max_results=200):
        """Fetch message IDs from the user's mailbox."""
        fetch_all = str(max_results).lower() == 'all'
        safety_limit = int(os.getenv('GMAIL_COMPLETE_SCAN_LIMIT', '5000'))
        target_count = safety_limit if fetch_all else int(max_results)
        page_size = min(target_count, 500)
        messages = []
        page_token = None

        try:
            while len(messages) < target_count:
                results = service.users().messages().list(
                    userId='me',
                    maxResults=min(page_size, target_count - len(messages)),
                    labelIds=['INBOX'],
                    pageToken=page_token
                ).execute()

                messages.extend(results.get('messages', []))
                page_token = results.get('nextPageToken')

                if not page_token:
                    break

            return messages
        except HttpError as error:
            print(f'An error occurred: {error}')
            return []
    
    def get_message_details(self, service, message_id):
        """Get detailed information about a single message."""
        try:
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='metadata',
                metadataHeaders=[
                    'From',
                    'Subject',
                    'Date',
                    'Content-Type',
                    'Content-Disposition',
                    'X-Attachment-Id'
                ]
            ).execute()
            
            return message
        except HttpError as error:
            print(f'An error occurred: {error}')
            return None
    
    def batch_get_messages(self, service, message_ids, max_results=None):
        """Batch fetch details for multiple messages."""
        messages = []
        limit = len(message_ids) if max_results in [None, 'all'] else int(max_results)

        for msg_id in message_ids[:limit]:
            message = self.get_message_details(service, msg_id.get('id'))
            if message:
                messages.append(message)
        
        return messages
    
    def move_to_trash(self, service, message_ids):
        """Move messages to trash."""
        processed = 0
        try:
            for msg_id in message_ids:
                service.users().messages().trash(userId='me', id=msg_id).execute()
                processed += 1
            return processed == len(message_ids), processed
        except HttpError as error:
            print(f'An error occurred: {error}')
            return False, processed
    
    def delete_permanently(self, service, message_ids):
        """Permanently delete messages."""
        try:
            for msg_id in message_ids:
                service.users().messages().delete(
                    userId='me',
                    id=msg_id
                ).execute()
            return True
        except HttpError as error:
            print(f'An error occurred: {error}')
            return False
    
    def archive_messages(self, service, message_ids):
        """Archive messages by removing them from the inbox."""
        try:
            service.users().messages().batchModify(
                userId='me',
                body={
                    'ids': message_ids,
                    'removeLabelIds': ['INBOX']
                }
            ).execute()
            return True, len(message_ids)
        except HttpError as error:
            print(f'An error occurred: {error}')
            return False, 0
