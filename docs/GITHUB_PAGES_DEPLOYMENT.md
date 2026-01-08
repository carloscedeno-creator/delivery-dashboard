# GitHub Pages Deployment Guide

## Problem
The application works locally but not on GitHub Pages because environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) are not available during the build process on GitHub Pages.

## Solution
Use GitHub Actions with GitHub Secrets to inject environment variables during the build process.

## Step-by-Step Setup

### 1. Configure GitHub Secrets

1. Go to your GitHub repository: `https://github.com/carloscedeno-creator/delivery-dashboard`
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

   **Secret 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://sywkskwkexwwdzrbwinp.supabase.co`

   **Secret 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon public key (get it from Supabase Dashboard > Settings > API > anon public key)

### 2. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
3. Save

### 3. Push Changes

The workflow file (`.github/workflows/deploy.yml`) is already created. Just push your changes:

```bash
git add .
git commit -m "Add GitHub Actions workflow for deployment"
git push origin V1.06
```

### 4. Verify Deployment

1. Go to **Actions** tab in your GitHub repository
2. You should see the workflow running
3. Once complete, check your GitHub Pages URL: `https://carloscedeno-creator.github.io/delivery-dashboard/`

## Alternative: Manual Deployment (Current Method)

If you prefer to keep using `npm run deploy`, you need to set environment variables before building:

### Option A: Set environment variables in your shell before building

```bash
# Windows PowerShell
$env:VITE_SUPABASE_URL="https://sywkskwkexwwdzrbwinp.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="your_anon_key_here"
npm run build
npm run deploy
```

```bash
# Linux/Mac
export VITE_SUPABASE_URL="https://sywkskwkexwwdzrbwinp.supabase.co"
export VITE_SUPABASE_ANON_KEY="your_anon_key_here"
npm run build
npm run deploy
```

### Option B: Modify package.json deploy script

Update the deploy script in `package.json`:

```json
"deploy": "cross-env VITE_SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co VITE_SUPABASE_ANON_KEY=your_key_here npm run build && gh-pages -d dist"
```

**⚠️ Warning:** Option B hardcodes the key in your code, which is not recommended for production. Use GitHub Secrets instead.

## Troubleshooting

### Build fails with "VITE_SUPABASE_ANON_KEY is not configured"
- Make sure GitHub Secrets are configured correctly
- Check that secret names match exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify the workflow file has access to secrets (check Actions tab)

### Application loads but shows errors
- Open browser console (F12) and check for errors
- Verify the Supabase URL and key are correct
- Check network tab to see if API calls are failing

### Assets not loading (404 errors)
- Verify `vite.config.js` has `base: '/delivery-dashboard/'` for production
- Check that `dist/index.html` has correct paths (should start with `/delivery-dashboard/`)

