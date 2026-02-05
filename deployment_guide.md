# Deployment Guide for Family Nutrition Tracker

Follow these steps to deploy your application to the web.

## Prerequisites
- [GitHub Account](https://github.com/)
- [Supabase Account](https://supabase.com/) (for Database)
- [Render Account](https://render.com/) (for Backend)
- [Netlify Account](https://www.netlify.com/) (for Frontend)

## Step 1: Database Setup (Supabase)
1.  Go to [Supabase](https://supabase.com/) and create a **New Project**.
2.  Give it a name and secure password. Select a region close to you.
3.  Once created, go to **Project Settings > Database**.
4.  Copy the **Connection String (Node.js/URI)**. It looks like:
    `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`
    *(Keep this safe, you will need it for the Backend)*

## Step 2: Push Code to GitHub
1.  Create a **New Repository** on GitHub (e.g., `family-nutrition-tracker`).
2.  Run these commands in your project root terminal:
    ```bash
    git init
    git add .
    git commit -m "Ready for deployment"
    git branch -M main
    git remote add origin https://github.com/<your-username>/family-nutrition-tracker.git
    git push -u origin main
    ```

## Step 3: Backend Deployment (Render)
1.  Go to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
2.  Connect your GitHub account and select your `family-nutrition-tracker` repo.
3.  Configure these settings:
    - **Name**: `family-nutrition-backend`
    - **Root Directory**: `backend`
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
4.  Scroll down to **Environment Variables** and add:
    - `DATABASE_URL`: *(Paste your Supabase connection string)*
    - `JWT_SECRET`: *(Generate a random strong string)*
    - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
    - `FRONTEND_URL`: `https://family-nutrition-tracker.netlify.app` *(You can update this later after Netlify deploy if the name differs)*
5.  Click **Create Web Service**.
6.  Wait for it to go **Live**. Copy your backend URL (e.g., `https://family-nutrition-backend.onrender.com`).

## Step 4: Frontend Deployment (Netlify)
1.  Go to [Netlify](https://app.netlify.com/) and click **Add new site > Import from Git**.
2.  Select **GitHub** and choose your repository.
3.  Configure Build Settings:
    - **Base directory**: `frontend`
    - **Build command**: `npm run build`
    - **Publish directory**: `frontend/build`
4.  Click **Advanced > New Variable** (Environment Variables):
    - **Key**: `REACT_APP_API_BASE`
    - **Value**: *(Paste your Render Backend URL, e.g., `https://family-nutrition-backend.onrender.com/api` - **Make sure to add /api at the end**)*
5.  Click **Deploy site**.

## Verification
- Open your Netlify URL.
- Try to **Register** a new user (this tests DB connection).
- Go to **Dashboard** (tests Analytics API).
- Go to **Recipes** (tests Backend API).

**Note:** The Render Free Tier "sleeps" after inactivity. The first request might take 50+ seconds. This is normal.
