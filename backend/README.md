# Python Backend for Gmail Organizer

Flask API backend that handles:
- OAuth 2.0 authentication with Google
- Gmail API integration for fetching, organizing, and managing emails
- Email classification and bucketing logic
- Bulk email operations (trash, archive, etc.)

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Add your Google Cloud credentials:
   - Set `GOOGLE_CLIENT_ID`
   - Set `GOOGLE_CLIENT_SECRET`
   - Set `FRONTEND_URL` (default: http://localhost:3000)

4. Run the backend:
```bash
python main.py
```

The server will start on http://localhost:5001

## API Endpoints

### Authentication
- `GET /api/auth/login` - Get OAuth authorization URL
- `GET /api/auth/callback?code=...&state=...` - Handle OAuth callback
- `POST /api/auth/refresh` - Refresh expired credentials
- `POST /api/auth/logout` - Logout user

### Email Operations
- `POST /api/emails/fetch` - Fetch and bucket user's emails
- `POST /api/emails/trash` - Move emails to trash
- `POST /api/emails/archive` - Archive emails
- `POST /api/emails/stats` - Get email statistics
