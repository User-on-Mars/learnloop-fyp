# LearnLoop Deployment Checklist

Use MongoDB Atlas for the database, Render for the API plus Redis-compatible Key Value, and Vercel for the frontend.

## 1. MongoDB Atlas

Create a MongoDB Atlas cluster and database user, then copy the Node.js connection string.

Use this shape:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/learnloop?retryWrites=true&w=majority
```

In Atlas Network Access, allow Render to connect. The fastest first deploy setting is `0.0.0.0/0`; tighten it later if you add static outbound IPs.

## 2. Render

Create a new Blueprint from this repo. Render will read `render.yaml` and create:

- `learnloop-api`
- `learnloop-redis`

During Blueprint setup, provide these prompted values:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
CLIENT_URL=https://temporary-or-final-vercel-url.vercel.app
FRONTEND_URL=https://temporary-or-final-vercel-url.vercel.app
FIREBASE_PROJECT_ID=learnloop-ab17a
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
ESEWA_SECRET_KEY=your_esewa_secret_or_test_secret
ESEWA_SUCCESS_URL=https://temporary-or-final-vercel-url.vercel.app/subscription/esewa/success
ESEWA_FAILURE_URL=https://temporary-or-final-vercel-url.vercel.app/subscription/esewa/failure
```

If you do not have SMTP yet, leave `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` empty.

After Render deploys, note the API URL:

```txt
https://learnloop-api.onrender.com
```

Check:

```txt
https://learnloop-api.onrender.com/api/health
```

## 3. Vercel

Create a Vercel project from the same repo.

Use:

```txt
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Set environment variables:

```env
VITE_API_URL=https://learnloop-api.onrender.com/api
VITE_WEBSOCKET_URL=https://learnloop-api.onrender.com
VITE_WS_URL=https://learnloop-api.onrender.com
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=learnloop-ab17a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=learnloop-ab17a
VITE_FIREBASE_APP_ID=your_firebase_web_app_id
```

After Vercel deploys, copy the final Vercel URL and update Render:

```env
CLIENT_URL=https://your-final-vercel-url.vercel.app
FRONTEND_URL=https://your-final-vercel-url.vercel.app
ESEWA_SUCCESS_URL=https://your-final-vercel-url.vercel.app/subscription/esewa/success
ESEWA_FAILURE_URL=https://your-final-vercel-url.vercel.app/subscription/esewa/failure
```

Then redeploy `learnloop-api`.

## Local Port 4000 Error

`EADDRINUSE :::4000` means another process is already using port `4000`. Stop the old backend terminal, or run the backend with another port for a quick local test:

```powershell
$env:PORT=4001; npm --workspace backend run start
```
