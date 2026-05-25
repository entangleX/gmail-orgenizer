"""Gmail API Service for handling email operations."""

import os
import time
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime

os.environ.setdefault('OAUTHLIB_RELAX_TOKEN_SCOPE', '1')

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
    'https://www.googleapis.com/auth/gmail.modify',
]

MESSAGE_METADATA_HEADERS = [
    'From',
    'Subject',
    'Date',
    'Content-Type',
    'Content-Disposition',
    'X-Attachment-Id'
]

METADATA_BATCH_SIZE = max(1, min(int(os.getenv('GMAIL_METADATA_BATCH_SIZE', '20')), 100))
ACTION_BATCH_SIZE = max(1, min(int(os.getenv('GMAIL_ACTION_BATCH_SIZE', '1')), 100))
ARCHIVE_BATCH_SIZE = max(1, min(int(os.getenv('GMAIL_ARCHIVE_BATCH_SIZE', '50')), 1000))
GMAIL_BATCH_PAUSE_SECONDS = float(os.getenv('GMAIL_BATCH_PAUSE_SECONDS', '0.2'))
GMAIL_MAX_RETRIES = max(0, int(os.getenv('GMAIL_MAX_RETRIES', '4')))
GMAIL_RETRY_BASE_SECONDS = float(os.getenv('GMAIL_RETRY_BASE_SECONDS', '1.0'))

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
            include_granted_scopes='true' if access_type in ['gmail', 'actions'] else 'false',
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
        granted_scopes = credentials.granted_scopes or credentials.scopes or []
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id or self.client_id,
            'scopes': credentials.scopes,
            'granted_scopes': granted_scopes,
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
            scopes=creds_dict.get('scopes'),
            granted_scopes=creds_dict.get('granted_scopes')
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

    def is_rate_limited(self, error):
        """Detect Gmail's per-user quota and concurrency throttles."""
        status = getattr(getattr(error, 'resp', None), 'status', None)
        content = error.content.decode('utf-8', errors='ignore') if getattr(error, 'content', None) else ''
        return status == 429 or (status == 403 and 'rateLimitExceeded' in content)

    def is_insufficient_permissions(self, error):
        """Detect tokens that do not actually include the required Gmail scope."""
        status = getattr(getattr(error, 'resp', None), 'status', None)
        content = error.content.decode('utf-8', errors='ignore') if getattr(error, 'content', None) else ''
        return status == 403 and 'insufficientPermissions' in content

    def execute_with_retry(self, request, description):
        """Execute a Gmail request, backing off when Google asks us to slow down."""
        for attempt in range(GMAIL_MAX_RETRIES + 1):
            try:
                return request.execute()
            except HttpError as error:
                if attempt >= GMAIL_MAX_RETRIES or not self.is_rate_limited(error):
                    raise

                delay = GMAIL_RETRY_BASE_SECONDS * (2 ** attempt)
                print(f'Gmail rate limit while {description}; retrying in {delay:.1f}s')
                time.sleep(delay)

        return None
    
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
                metadataHeaders=MESSAGE_METADATA_HEADERS
            ).execute()
            
            return message
        except HttpError as error:
            print(f'An error occurred: {error}')
            return None
    
    def batch_get_messages(self, service, message_ids, max_results=None):
        """Batch fetch details for multiple messages."""
        limit = len(message_ids) if max_results in [None, 'all'] else int(max_results)
        target_ids = [msg.get('id') for msg in message_ids[:limit] if msg.get('id')]
        messages_by_id = {}

        def collect_message(request_id, response, exception):
            if exception is not None:
                print(f'An error occurred: {exception}')
                return
            if response:
                messages_by_id[response.get('id')] = response

        for start in range(0, len(target_ids), METADATA_BATCH_SIZE):
            batch = service.new_batch_http_request(callback=collect_message)
            for message_id in target_ids[start:start + METADATA_BATCH_SIZE]:
                batch.add(
                    service.users().messages().get(
                        userId='me',
                        id=message_id,
                        format='metadata',
                        metadataHeaders=MESSAGE_METADATA_HEADERS
                    ),
                    request_id=message_id
                )
            batch.execute()
            if GMAIL_BATCH_PAUSE_SECONDS:
                time.sleep(GMAIL_BATCH_PAUSE_SECONDS)
        
        return [messages_by_id[message_id] for message_id in target_ids if message_id in messages_by_id]
    
    def move_to_trash(self, service, message_ids, progress_callback=None):
        """Move messages to trash."""
        trashed_ids = []
        failed_ids = []
        rate_limited = False
        insufficient_scope = False

        for message_id in message_ids:
            try:
                response = self.execute_with_retry(
                    service.users().messages().trash(
                        userId='me',
                        id=message_id
                    ),
                    f'trashing message {message_id}'
                )
                if response:
                    trashed_ids.append(message_id)
                    if progress_callback:
                        progress_callback(message_id, True)
                if GMAIL_BATCH_PAUSE_SECONDS:
                    time.sleep(GMAIL_BATCH_PAUSE_SECONDS)
            except HttpError as error:
                print(f'An error occurred while trashing {message_id}: {error}')
                failed_ids.append(message_id)
                if progress_callback:
                    progress_callback(message_id, False)
                rate_limited = self.is_rate_limited(error)
                insufficient_scope = self.is_insufficient_permissions(error)
                if rate_limited or insufficient_scope:
                    break

        return {
            'success': len(trashed_ids) == len(message_ids),
            'count': len(trashed_ids),
            'trashed_ids': trashed_ids,
            'failed_ids': failed_ids,
            'rate_limited': rate_limited,
            'insufficient_scope': insufficient_scope,
        }
    
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
    
    def archive_messages(self, service, message_ids, progress_callback=None):
        """Archive messages by removing them from the inbox."""
        archived_ids = []
        failed_ids = []
        rate_limited = False
        insufficient_scope = False

        try:
            for start in range(0, len(message_ids), ARCHIVE_BATCH_SIZE):
                chunk = message_ids[start:start + ARCHIVE_BATCH_SIZE]
                self.execute_with_retry(
                    service.users().messages().batchModify(
                        userId='me',
                        body={
                            'ids': chunk,
                            'removeLabelIds': ['INBOX']
                        }
                    ),
                    f'archiving {len(chunk)} messages'
                )
                archived_ids.extend(chunk)
                if progress_callback:
                    for message_id in chunk:
                        progress_callback(message_id, True)
                if GMAIL_BATCH_PAUSE_SECONDS:
                    time.sleep(GMAIL_BATCH_PAUSE_SECONDS)
        except HttpError as error:
            print(f'An error occurred: {error}')
            failed_ids.extend(message_ids[len(archived_ids):])
            rate_limited = self.is_rate_limited(error)
            insufficient_scope = self.is_insufficient_permissions(error)
            if progress_callback:
                for message_id in failed_ids:
                    progress_callback(message_id, False)

        return {
            'success': len(archived_ids) == len(message_ids),
            'count': len(archived_ids),
            'archived_ids': archived_ids,
            'failed_ids': failed_ids,
            'rate_limited': rate_limited,
            'insufficient_scope': insufficient_scope,
        }
