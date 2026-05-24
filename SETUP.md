# Quick Setup Guide

## 1️⃣ Google Cloud Console Setup (5 minutes)

### Create Project
1. Go to https://console.cloud.google.com/
2. Create a new project (name: "Gmail Organizer")

### Enable Gmail API
1. Search for "Gmail API"
2. Click "Enable"

### Create OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in app name: "Gmail Organizer"
4. Add your email as a test user

### Create OAuth Credentials
1. Go to "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback
   ```
5. Copy **Client ID** and **Client Secret**

## 2️⃣ Local Development Setup (3 minutes)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Google credentials
python main.py
```

### Frontend (new terminal)
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit http://localhost:3000

## 3️⃣ Using Docker (Optional)

```bash
# Create .env file with your credentials
cp backend/.env.example backend/.env

# Run both services
docker-compose up

# Frontend: http://localhost:3000
# Backend: http://localhost:5001
```

## 4️⃣ Deployment

### Backend to Heroku
```bash
# Create .env with production URLs
heroku create your-app-name
git push heroku main
heroku config:set GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx
```

### Frontend to Vercel
```bash
vercel
# Set NEXT_PUBLIC_BACKEND_URL to your Heroku URL
```

## 🎉 You're Done!

Your Gmail Organizer is now running! Start organizing your inbox.
