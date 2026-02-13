# 🚀 Vercel Deployment Guide

## About `vercel.json`

The `vercel.json` file in your project is **already configured correctly**. You don't need to change it!

```json
{
  "env": {
    "GROQ_API_KEY_1": "@groq_api_key_1",
    "GROQ_API_KEY_2": "@groq_api_key_2"
  }
}
```

The `@` symbol tells Vercel to look for environment variables you'll set in the dashboard or CLI.

---

## 🎯 How to Deploy

### Option 1: Vercel Dashboard (Easiest)

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/research-intelligence-portal.git
git push -u origin main
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Click "Deploy"

3. **Add Environment Variables:**
   - After deployment, go to Project Settings
   - Click "Environment Variables"
   - Add:
     - Name: `GROQ_API_KEY_1` | Value: `gsk_your_first_key`
     - Name: `GROQ_API_KEY_2` | Value: `gsk_your_second_key`
   - Select "Production", "Preview", and "Development"
   - Click "Save"

4. **Redeploy:**
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

### Option 2: Vercel CLI (Faster)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (first time)
vercel

# Add environment variables
vercel env add GROQ_API_KEY_1
# When prompted, paste your first Groq key
# Select: Production, Preview, Development (press Space, then Enter)

vercel env add GROQ_API_KEY_2
# When prompted, paste your second Groq key
# Select: Production, Preview, Development (press Space, then Enter)

# Deploy to production with env vars
vercel --prod
```

---

## ✅ Verification

After deployment, check your Vercel dashboard:

**Environment Variables should show:**
```
GROQ_API_KEY_1  •••••••••••  Production, Preview, Development
GROQ_API_KEY_2  •••••••••••  Production, Preview, Development
```

**Your app will be live at:**
```
https://your-project-name.vercel.app
```

---

## 🔧 Updating Environment Variables

### Via Dashboard:
1. Go to Project Settings → Environment Variables
2. Click "Edit" next to the variable
3. Update the value
4. Redeploy

### Via CLI:
```bash
# Remove old variable
vercel env rm GROQ_API_KEY_1

# Add new one
vercel env add GROQ_API_KEY_1

# Redeploy
vercel --prod
```

---

## ❓ FAQ

### Q: Do I need to change `vercel.json`?
**A:** No! It's already configured correctly. Just add your API keys as environment variables.

### Q: What does `@groq_api_key_1` mean?
**A:** The `@` tells Vercel to use the environment variable you set. The name after `@` is just a reference - the actual variable name is `GROQ_API_KEY_1`.

### Q: Can I use different variable names?
**A:** Yes, but you'd need to update both `vercel.json` AND `server.js`. Easier to keep the current names.

### Q: How do I keep my keys secret on GitHub?
**A:** Your `.env.local` file is in `.gitignore`, so it won't be pushed to GitHub. Only `.env.example` (without real keys) is pushed.

---

## 🎉 You're Done!

Once environment variables are set in Vercel, your app will work perfectly in production!

**Remember:**
- `.env.local` - For local development (never commit!)
- `vercel.json` - Configuration (commit this)
- Vercel Dashboard/CLI - Set actual API keys here
