# Gmail Organizer - Full Stack Application

A complete, free Gmail optimization tool built with Python backend + React frontend. Automatically organize, classify, and bulk-delete emails without storing user data.

## 🎯 Features

✅ **OAuth 2.0 Authentication** - Secure Google login  
✅ **Smart Email Classification** - AI-powered bucketing into 6 categories  
✅ **Bulk Operations** - Delete/archive hundreds of emails at once  
✅ **Zero Data Storage** - Emails stay in browser, never saved on server  
✅ **Beautiful Dashboard** - See stats and organize emails visually  
✅ **Free Stack** - Runs on Vercel/Netlify (frontend) + Heroku/Railway (backend)  

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
   - Scopes: `gmail.readonly`, `gmail.modify`
   - Add yourself as a test user
5. Create OAuth Client ID (Web):
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (development)
     - `https://your-backend.herokuapp.com/api/auth/callback` (production)
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

Emails are automatically bucketed into 6 categories:

| Category | Detection | Use |
|----------|-----------|-----|
| **Promotions** | Gmail's CATEGORY_PROMOTIONS label + keywords (sale, discount, offer) | Bulk delete marketing emails |
| **Social** | CATEGORY_SOCIAL label + keywords (mentioned, tagged) | Social media notifications |
| **Updates** | CATEGORY_UPDATES label + keywords (notification, reminder) | Newsletters and updates |
| **Educational** | Keywords (.edu, course, assignment, exam) | School/course emails |
| **Legal** | Keywords (legal, terms, privacy, agreement) | Terms & policy notices |
| **Other** | Unclassified | Everything else |

## 🔒 Privacy & Security

- **Zero Backend Storage**: Emails are fetched into browser memory only
- **No User Data**: We don't store emails, attachments, or metadata
- **Temporary Data**: All data cleared when you close the browser tab
- **OAuth 2.0**: Industry-standard secure authentication
- **Read-Only**: Only reads from Gmail (can be changed in scopes)

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

### Backend Deployment (Heroku/Railway)

```bash
# Using Heroku
heroku create your-gmail-organizer-backend
git push heroku main

# Update CORS in .env
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Vercel
npm install -g vercel
vercel

# Update environment
NEXT_PUBLIC_BACKEND_URL=https://your-backend.herokuapp.com
```

## 🐛 Troubleshooting

### "Cannot POST /api/auth/callback"
- Make sure backend is running on port 5001
- Check `FRONTEND_URL` and `BACKEND_URL` in `.env` files

### "Gmail API not enabled"
- Go to Google Cloud Console
- Enable the Gmail API for your project
- Make sure your OAuth app is in "Testing" mode

### "CORS errors"
- Backend CORS is configured for `localhost:3000` and `localhost:5173`
- Update `app/__init__.py` with your production URLs

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
