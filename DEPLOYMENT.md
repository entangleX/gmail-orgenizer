# Production Deployment

This app is set up to deploy the Next.js frontend and Flask backend to Google Cloud Run through GitHub Actions.

## GCP Resources

Create these once:

- Google Cloud project
- Artifact Registry Docker repository
- Two Cloud Run services:
  - `gmail-organizer-backend`
  - `gmail-organizer-frontend`
- Secret Manager secrets:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `FLASK_SECRET_KEY`

Enable these APIs:

- Cloud Run API
- Artifact Registry API
- Secret Manager API
- IAM Credentials API
- Gmail API

## GitHub Actions Variables

Add these in GitHub repo settings under **Secrets and variables > Actions > Variables**:

```text
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
GCP_ARTIFACT_REPOSITORY=gmail-organizer
GCP_BACKEND_SERVICE=gmail-organizer-backend
GCP_FRONTEND_SERVICE=gmail-organizer-frontend
BACKEND_URL=https://your-backend-service-url
FRONTEND_URL=https://your-frontend-service-url
FRONTEND_CALLBACK_URL=https://your-frontend-service-url/api/auth/callback
NEXT_PUBLIC_BACKEND_URL=https://your-backend-service-url
GMAIL_COMPLETE_SCAN_LIMIT=5000
```

## GitHub Actions Secrets

Add these under **Secrets and variables > Actions > Secrets**:

```text
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/.../locations/global/workloadIdentityPools/.../providers/...
GCP_SERVICE_ACCOUNT=github-deployer@your-project.iam.gserviceaccount.com
```

The workflow uses Workload Identity Federation. Avoid committing service account JSON keys.

## Google OAuth

In Google Cloud OAuth client settings, add the production redirect URI:

```text
https://your-frontend-service-url/api/auth/callback
```

For public Gmail access, submit Google OAuth verification for Gmail scopes.

## Notes

Complete inbox scans are supported with `max_results: "all"`, but production should move these scans into a background worker before public launch.
