# Python Backend for MailTriage

Flask API backend that handles:
- OAuth 2.0 authentication with Google
- Gmail API integration for metadata-only scanning
- Email classification and bucketing logic using headers, labels, dates, and size estimates
- User-confirmed bulk actions after separate Gmail modify consent
- Google access revocation and session clearing

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
- `POST /api/auth/revoke` - Revoke Google OAuth access and clear session

### Email Operations
- `POST /api/emails/fetch` - Fetch and bucket user's emails
- `POST /api/emails/trash` - Move emails to trash
- `POST /api/emails/archive` - Archive emails
- `POST /api/emails/stats` - Get email statistics

## Google OAuth Scopes

The backend uses incremental authorization so users do not grant Gmail access until they start a Gmail-specific workflow.

| Flow | Scopes | Why |
|------|--------|-----|
| Signup | `openid`, `userinfo.email`, `userinfo.profile` | Create a basic session and show the signed-in user. |
| Gmail scan | `gmail.metadata` plus profile scopes | Read message IDs, labels, selected headers, dates, and metadata needed for cleanup classification. |
| Archive/trash | `gmail.modify` plus scan/profile scopes | Archive or move only user-selected messages to trash after confirmation. |

Do not add `gmail.readonly` unless the product intentionally starts reading message bodies or snippets. Current code is designed around `gmail.metadata`.

## Privacy Architecture

- The backend does not persist Gmail scan results to a database.
- Gmail scan uses `format='metadata'`, not full message payloads.
- The scan requests selected headers only: `From`, `Subject`, `Date`, `Content-Type`, `Content-Disposition`, and `X-Attachment-Id`.
- The backend does not fetch message bodies, Gmail snippets, attachment contents, or attachment files.
- Raw metadata is processed in memory and returned as category-level dashboard rows.
- OAuth credentials are returned to the frontend session flow and are not stored in the Flask signed session cookie.
- `POST /api/auth/revoke` calls Google's token revoke endpoint so users can disconnect Google access from the app.

## Google Verification Checklist

Before submitting OAuth verification, confirm:

- Production frontend is public and stable.
- `/privacy`, `/terms`, and `/data-deletion` are public and linked from the login page.
- OAuth consent screen app name matches the deployed product branding.
- Authorized domains and redirect URIs match the production frontend domain.
- Gmail API is enabled in the same Google Cloud project as the OAuth client.
- OAuth consent scopes are limited to profile scopes, `gmail.metadata`, and `gmail.modify`.
- Scope justifications explain incremental consent and why each scope is needed.
- Test user flow works end to end on the production URL.

Recommended scope justification:

```text
MailTriage uses incremental authorization. Signup requests only basic profile scopes. When a user chooses to scan their inbox, the app requests gmail.metadata to read message IDs, labels, selected headers, dates, and size estimates needed to calculate a temporary cleanup dashboard. The app does not fetch message bodies, Gmail snippets, attachment contents, or attachment files. When a user selects emails and chooses Archive or Trash, the app requests gmail.modify so it can perform only that confirmed action on the selected message IDs.
```

## Verification Demo Video Script

Record the production app and show:

1. Public login page with links to Privacy, Terms, and Data Deletion.
2. Signup with Google using only profile scopes.
3. The Gmail metadata permission prompt when clicking "Scan my inbox".
4. The Google OAuth consent screen with the requested scopes visible.
5. Dashboard population from metadata-only classifications.
6. The action permission prompt before archive/trash.
7. A user-confirmed archive or trash action.
8. Disconnect flow that revokes Google access and clears the local session.

Use narration or captions to call out that the backend uses metadata-only scanning and does not store Gmail message bodies, snippets, or attachment contents.
