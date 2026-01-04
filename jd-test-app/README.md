# JD OAuth Test App

Simple Next.js app for testing the `@acreblitz/platform-integrations` package with John Deere Operations Center.

## Setup

1. Copy the environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Add your John Deere OAuth credentials to `.env.local`:
   ```
   JD_CLIENT_ID=your_client_id
   JD_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ```

3. Make sure your John Deere application has `http://localhost:3000/api/auth/callback` as a registered redirect URI.

4. Install dependencies:
   ```bash
   npm install
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Testing OAuth Flow

1. Click "Connect to John Deere"
2. Log in with your John Deere account
3. Grant the requested permissions
4. You'll be redirected back to the app
5. If organization selection is required, you'll see a prompt to complete that step

## Local Package

This app uses the local `@acreblitz/platform-integrations` package via:
```json
"@acreblitz/platform-integrations": "file:../packages/platform-integrations"
```

If you make changes to the package, rebuild it:
```bash
cd ../packages/platform-integrations && npm run build
```
