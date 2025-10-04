# Authentication Setup Guide

This project uses **Auth.js v5** (formerly NextAuth.js) for Google OAuth authentication with YouTube API access.

## Required Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-generated-secret-here"

# From Google Cloud Console (https://console.cloud.google.com/apis/credentials)
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Optional: YouTube Data API Key for public playlists
NEXT_PUBLIC_YOUTUBE_API_KEY="your-youtube-api-key"
```

## Google Cloud Setup

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`

### 2. Configure OAuth Consent Screen

1. Go to "OAuth consent screen"
2. Choose "External" (or "Internal" if using Google Workspace)
3. Add required scopes:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.readonly`
4. Add your email to test users (for testing phase)

### 3. Generate AUTH_SECRET

Run this command to generate a secure random secret:

```bash
openssl rand -base64 32
```

## Migration from Old Auth Implementation

The app has been migrated from manual Google OAuth to Auth.js v5. Key changes:

### What Changed

- ✅ **Automatic token refresh** - Auth.js handles this automatically
- ✅ **Server-side session management** - More secure than client-side only
- ✅ **Better error handling** - Built-in retry and error states
- ✅ **Simplified codebase** - Removed ~200 lines of manual OAuth code

### Component Updates

All components now use the new `useAuth()` hook from `~/components/auth/useAuth` which provides:

```typescript
const {
  isReady,          // Auth system is initialized
  isAuthenticated,  // User is signed in
  accessToken,      // Current YouTube API access token
  error,            // Authentication error if any
  signIn,           // Function to initiate sign-in
  signOut,          // Function to sign out
  getTokenSilently  // Get fresh token (handled automatically by Auth.js)
} = useAuth();
```

### Breaking Changes

- Environment variables renamed from `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `AUTH_GOOGLE_ID`
- New required variable: `AUTH_SECRET`
- Client secret now required: `AUTH_GOOGLE_SECRET` (server-side only, more secure)

## Troubleshooting

### "Invalid client" error

- Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are correct
- Check that redirect URIs in Google Cloud Console match your domain

### "Access denied" error

- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Verify OAuth consent screen has the correct scopes
- Add your email to test users if app is in testing phase

### Token refresh errors

- Check that `access_type: "offline"` is configured (already set in `auth.ts`)
- Ensure `prompt: "consent"` forces refresh token generation (already set)

## Testing

1. Start the development server: `pnpm dev`
2. Navigate to `http://localhost:3000`
3. Click "Sign in with Google"
4. Grant permissions when prompted
5. You should see your YouTube playlists

## Production Deployment

1. Set all environment variables in your hosting platform (Vercel, etc.)
2. Update Google Cloud Console authorized redirect URIs with production URL
3. If using Vercel, `AUTH_SECRET` is automatically generated if not provided
4. Ensure OAuth consent screen is published (not in testing mode) for public use


