# Gmail Organizer - Frontend

React/Next.js frontend for Gmail email organization and management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your backend URL:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Features

- **OAuth 2.0 Integration**: Sign in with your Google account
- **Email Fetching**: Fetch up to 200 emails from your inbox
- **Auto-Classification**: Emails are automatically bucketed into categories:
  - Promotions
  - Social
  - Updates
  - Educational
  - Legal
  - Other
- **Bulk Actions**: 
  - Select multiple emails
  - Delete to trash
  - Archive emails
- **Statistics Dashboard**: View email distribution across categories
- **Privacy First**: All data stays in your browser - no server-side storage

## Project Structure

```
app/
  ├── components/
  │   ├── LoginPage.tsx
  │   ├── Dashboard.tsx
  │   ├── EmailBucket.tsx
  │   ├── EmailItem.tsx
  │   └── [*.module.css]
  ├── utils/
  │   ├── api.ts
  │   └── auth.ts
  ├── dashboard/
  │   └── page.tsx
  ├── page.tsx
  ├── layout.tsx
  └── globals.css
```

## Technologies

- Next.js 14
- React 18
- TypeScript
- Axios (HTTP client)
- CSS Modules (styling)
