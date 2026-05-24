# Gmail Organizer - Full Stack Application

A Gmail optimization tool built with a Flask backend and Next.js frontend. It classifies inbox metadata into cleanup groups and only requests archive/trash permission when the user chooses an action.

## 🎯 Features

✅ **OAuth 2.0 Authentication** - Secure Google login  
✅ **Smart Email Classification** - Metadata-based bucketing into cleanup categories
✅ **Bulk Operations** - Delete/archive hundreds of emails at once  
✅ **Privacy-first Scan** - No message bodies, snippets, or attachment contents are fetched for scanning
✅ **Beautiful Dashboard** - See stats and organize emails visually  
✅ **Cloud Run Ready** - GitHub Actions deployment to Google Cloud Run

## 📁 Project Structure

```
Gmail-Organizer/
├── backend/                  # Python Flask API
│   ├── app/
│   │   ├── services/        # Gmail API & bucketing logic
│   │   ├── routes/          # API endpoints
│   │   └── __init__.py
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/                 # React/Next.js UI
│   ├── app/
│   │   ├── components/      # React components
│   │   ├── utils/           # API client & auth helpers
│   │   ├── dashboard/       # Dashboard page
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── .env.local.example
│   └── README.md
├── Phase_1/                  # Setup instructions
│   └── instructions.txt
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Google Cloud account (free)

### Step 1: Google Cloud Setup (One-Time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **Gmail API**
4. Create OAuth Consent Screen:
   - User Type: External
   - Publishing Status: Testing
   - Signup scopes: `openid`, `userinfo.email`, `userinfo.profile`
   - Gmail scan scope: `gmail.metadata`
   - Action scope requested only when needed: `gmail.modify`
   - Add yourself as a test user
5. Create OAuth Client ID (Web):
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (development)
     - `https://your-frontend-cloud-run-url/api/auth/callback` (production)
6. Copy your **Client ID** and **Client Secret**

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your Google credentials
# GOOGLE_CLIENT_ID=your_client_id_here
# GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cp .env.local.example .env.local

# Update .env.local if needed
# NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
# NEXT_PUBLIC_SUPPORT_EMAIL=your-support-email@example.com
```

### Step 4: Run Locally

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
# Server runs on http://localhost:5001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

Visit http://localhost:3000 and sign in with your Google account!

## 📊 Email Classification

Emails are automatically bucketed into cleanup categories from Gmail labels and selected metadata headers:

| Category | Detection | Use |
|----------|-----------|-----|
| **Quick cleanup** | Attachments, promotions, newsletters, OTPs, jobs, spam-like metadata | Fast review and cleanup |
| **Identity & institutions** | Government/ID, institutional, legal, education metadata | Review carefully |
| **Review first** | Shopping, receipts, finance, travel metadata | Keep or archive intentionally |
| **General** | Social, updates, other metadata | Routine inbox cleanup |

## 🔒 Privacy & Security

- **Zero Backend Persistence**: Email metadata is processed in memory and not saved to a database
- **No Message Bodies**: Scan mode uses Gmail metadata only, not message bodies, snippets, or attachment contents
- **Temporary Scan Data**: Email scan results are kept client-side for the active session
- **OAuth 2.0**: Signup, scan, and action permissions are separated
- **Least Privilege**: Archive/trash access is requested separately from scan access
- **Limited Use**: Google API data use is limited to user-facing inbox organization and user-confirmed Gmail actions

## 🛠️ API Endpoints

### Authentication
- `GET /api/auth/login` - Get OAuth authorization URL
- `GET /api/auth/callback` - OAuth callback handler
- `POST /api/auth/refresh` - Refresh expired credentials
- `POST /api/auth/logout` - Logout and clear session

### Email Operations
- `POST /api/emails/fetch` - Fetch and classify emails
- `POST /api/emails/trash` - Move emails to trash
- `POST /api/emails/archive` - Archive emails
- `POST /api/emails/stats` - Get email statistics

## 🚢 Deployment

### Google Cloud Run

This repo includes `.github/workflows/deploy-gcp.yml` for Cloud Run deployment. Configure GitHub Actions secrets/variables for the GCP project, Cloud Run service names, production URLs, and `NEXT_PUBLIC_SUPPORT_EMAIL`, then push to `main` or run the workflow manually.

## 🐛 Troubleshooting

### "Cannot POST /api/auth/callback"
- Make sure backend is running on port 5001
- Check `FRONTEND_URL` and `BACKEND_URL` in `.env` files

### "Gmail API not enabled"
- Go to Google Cloud Console
- Enable the Gmail API for your project
- Make sure your OAuth app is in "Testing" mode

### "CORS errors"
- Set `CORS_ORIGINS` to your production frontend origin
- In development, localhost origins are allowed when `FLASK_ENV=development`

### "No emails showing"
- Make sure you added your email as a test user in Google Cloud Console
- Check that you have emails in your inbox
- Try refreshing the page

## 📝 Technologies Used

**Backend:**
- Flask 2.3.3
- Google Auth OAuthlib
- Google API Python Client
- Python-dotenv

**Frontend:**
- Next.js 14
- React 18
- TypeScript
- Axios
- CSS Modules

## 📄 License

MIT License - Feel free to use, modify, and deploy!

## 🤝 Contributing

Pull requests are welcome! Areas for improvement:
- [ ] Add filter/search functionality
- [ ] Support for custom labels
- [ ] Scheduled cleanup automation
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Email preview feature

## 📧 Support

For issues, questions, or suggestions, please create an issue on GitHub.

---

**Made with ❤️ for Gmail users everywhere**
