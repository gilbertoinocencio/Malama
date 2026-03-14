# NURA Setup Guide

Complete step-by-step guide to get NURA up and running.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Gemini API Setup](#gemini-api-setup)
4. [Local Development Setup](#local-development-setup)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** v18+ installed ([Download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- A **Google Account** (for Gemini API)
- A **Supabase Account** (free tier available)

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub or create an account
4. Click "New Project"
5. Fill in:
   - **Name**: nura (or any name you prefer)
   - **Database Password**: Generate a strong password (save it somewhere safe!)
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait 2-3 minutes for project to be ready

### 2. Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** (gear icon) → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")
3. Save these for later

### 3. Set Up the Database

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the `supabase-schema.sql` file from this repository
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Wait for it to finish (you should see "Success. No rows returned")

**What this does:**
- Creates all necessary tables (profiles, meals, daily_logs, etc.)
- Sets up Row Level Security (RLS) for data protection
- Creates a storage bucket for meal photos
- Sets up automatic profile creation on user signup

### 4. Enable Google OAuth (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. Click on **Google**
3. Toggle **Enable Sign in with Google**
4. Follow the instructions to:
   - Create a Google Cloud Project
   - Enable Google+ API
   - Create OAuth credentials
   - Add authorized redirect URIs
5. Copy the **Client ID** and **Client Secret** into Supabase
6. Click **Save**

### 5. Configure Storage

1. Go to **Storage** in the left sidebar
2. You should see a bucket named **meal-photos**
3. Click on it
4. The bucket is already configured as public with the correct policies from the SQL script
5. Test it by uploading a sample image

## Gemini API Setup

### 1. Get Your API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select an existing Google Cloud project or create a new one
5. Click **"Create API key in new project"** (or select existing)
6. Copy the API key that appears
7. **Important**: Save this key securely. You won't be able to see it again!

### 2. (Optional) Monitor Usage

1. In Google AI Studio, go to **"API Keys"** in the left menu
2. You can see your usage and rate limits
3. Free tier includes:
   - 60 requests per minute
   - 1,500 requests per day
   - 1 million tokens per day

## Local Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/nura.git
cd nura

# Install dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local with your credentials
```

Your `.env.local` should look like this:

```env
VITE_GEMINI_API_KEY=AIza...your_key_here
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your_key_here
```

### 3. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. First Time Setup

1. Open the app in your browser
2. Click **"Sign in with Google"** or create an account with email
3. After signing in, you'll be prompted to complete your profile:
   - Enter your weight, height, age, and gender
   - Select your biotype (Ectomorph, Mesomorph, or Endomorph)
   - Choose your goal (Aesthetic, Health, or Performance)
   - Set your activity level
4. Click **"Calculate Macros"**
5. You're all set! Start logging meals

## Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"**
4. Import your GitHub repository
5. Add environment variables:
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **"Deploy"**

### Option 2: Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click **"Add new site"** → **"Import an existing project"**
4. Select your repository
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add environment variables in **Site settings** → **Environment variables**
7. Click **"Deploy site"**

### Option 3: Self-Hosted

```bash
# Build the production version
npm run build

# The dist/ folder contains all static files
# Upload dist/ to any static hosting service (AWS S3, DigitalOcean Spaces, etc.)
```

## Troubleshooting

### Common Issues

#### 1. "Missing Supabase environment variables"

**Solution**: Make sure you have a `.env.local` file in the root directory with all required variables.

#### 2. "Error fetching profile" or "User not found"

**Solution**:
- Make sure you ran the `supabase-schema.sql` script
- Check that the `profiles` table exists in Supabase
- Verify RLS policies are enabled

#### 3. "Gemini API Error" or "API Key missing"

**Solution**:
- Verify your API key is correct in `.env.local`
- Check you haven't exceeded rate limits
- Ensure the key starts with `VITE_`

#### 4. Meals not saving

**Solution**:
- Check Supabase RLS policies for the `meals` table
- Verify you're logged in
- Check browser console for errors

#### 5. Images not uploading

**Solution**:
- Verify the `meal-photos` storage bucket exists
- Check storage policies in Supabase
- Ensure the bucket is set to public

### Need More Help?

- Check the [GitHub Issues](https://github.com/yourusername/nura/issues)
- Join our [Community Discord](https://discord.gg/nura)
- Email support: support@nura.app

## Development Tips

### Hot Reload Not Working?

Try:
```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

### Clear All Data (Reset)

To reset your local development database:

1. Go to Supabase Dashboard → **Database** → **Tables**
2. Delete data from tables (or drop and recreate using the SQL script)

### Testing PWA Features

1. Build for production: `npm run build`
2. Preview: `npm run preview`
3. Open in Chrome
4. Open DevTools → Application → Service Workers
5. Check "Update on reload"

---

**Ready to Flow!** 🌊

If you've completed all steps, you should have a fully functional NURA instance running locally and/or deployed to production.
