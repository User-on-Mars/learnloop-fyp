# Reflection Save Issue - Debugging Guide

## Problem
Reflections are not being saved to the app or database.

## Code Analysis
The code structure looks correct:
- ✅ Frontend: ReflectPage.jsx properly calls `api.post('/reflections', reflectionData)`
- ✅ Backend: Route handler exists at `/api/reflections` (POST)
- ✅ Controller: `createReflection()` function properly validates and saves to MongoDB
- ✅ Model: Reflection schema is properly defined
- ✅ Auth: Middleware extracts user ID from Firebase token

## Debugging Steps

### Step 1: Check if Backend is Running
```bash
# Test the health endpoint
curl http://localhost:4000/api/health
```
Expected: `{"ok":true}`

### Step 2: Check if Frontend is Running
```bash
cd frontend
npm run dev
```
Expected: Server running on http://localhost:5173

### Step 3: Check Browser Console
1. Open the app in browser (http://localhost:5173)
2. Navigate to the Reflect page
3. Open Developer Tools (F12)
4. Go to Console tab
5. Try to save a reflection
6. Look for these logs:

**Expected logs:**
```
🚀 API Request: POST /reflections
✅ API Response: POST /reflections
```

**If you see errors:**
- `❌ API Error` - Check the error message
- `⚠️ No authenticated user found` - User is not logged in
- `401 Unauthorized` - Token is invalid or expired

### Step 4: Check Backend Console
Look at the terminal where backend is running. When you save a reflection, you should see:

**Expected logs:**
```
📨 POST /api/reflections { content: '...', mood: '...', tags: [...] }
🔐 Auth: Verifying token...
✅ Auth: Firebase token decoded, user: <userId>
📝 Creating reflection for user: <userId>
✅ Reflection created: <reflectionId>
```

**If you see errors:**
- `❌ Auth: Missing token` - Frontend is not sending the token
- `❌ Auth: Token expired` - User needs to log in again
- `❌ Error creating reflection` - Check the error message

### Step 5: Check Database Connection
In backend console, when server starts, you should see:
```
MongoDB connected
🚀 API running on http://localhost:4000
```

If not, check:
- MongoDB URI in `backend/.env`
- Network connection
- MongoDB Atlas cluster status

### Step 6: Check Authentication
1. In browser console, check if user is authenticated:
```javascript
// Run this in browser console
console.log('Current user:', auth.currentUser);
```

2. If `null`, user is not logged in - go to login page
3. If user exists, try to get token:
```javascript
// Run this in browser console
auth.currentUser.getIdToken().then(token => console.log('Token:', token));
```

### Step 7: Manual API Test
If user is authenticated, test the API directly:

1. Get the token from browser console (Step 6)
2. Use curl or Postman to test:

```bash
curl -X POST http://localhost:4000/api/reflections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"content":"Test reflection","mood":"Happy","tags":["test"]}'
```

Expected: `201 Created` with reflection data

## Common Issues & Solutions

### Issue 1: "No authenticated user found"
**Cause:** User is not logged in or session expired
**Solution:** 
1. Go to login page
2. Log in with valid credentials
3. Try saving reflection again

### Issue 2: "Failed to save reflection"
**Cause:** Backend error or validation failure
**Solution:**
1. Check backend console for specific error
2. Verify content is not empty
3. Verify content is under 10,000 characters
4. Check mood is one of: Happy, Neutral, Sad, Energized, Thoughtful

### Issue 3: "Network Error"
**Cause:** Backend is not running or wrong URL
**Solution:**
1. Check backend is running on port 4000
2. Verify `VITE_API_URL` in `frontend/.env` is `http://localhost:4000/api`
3. Restart both frontend and backend

### Issue 4: "CORS Error"
**Cause:** CORS configuration issue
**Solution:** Already configured correctly in backend, but if issue persists:
1. Clear browser cache
2. Restart backend server
3. Check browser console for specific CORS error

### Issue 5: Database Not Connected
**Cause:** MongoDB connection failed
**Solution:**
1. Check `MONGODB_URI` in `backend/.env`
2. Verify MongoDB Atlas cluster is running
3. Check network/firewall settings
4. Verify database credentials

## Quick Fix Checklist

- [ ] Backend server is running (port 4000)
- [ ] Frontend server is running (port 5173)
- [ ] User is logged in (check browser console)
- [ ] MongoDB is connected (check backend console)
- [ ] No CORS errors in browser console
- [ ] No authentication errors in backend console
- [ ] Reflection content is not empty
- [ ] Reflection content is under 10,000 characters

## Next Steps

If all checks pass but reflections still don't save:
1. Share the exact error message from browser console
2. Share the backend console logs when attempting to save
3. Check if reflections are being created in MongoDB (use MongoDB Compass or Atlas UI)
