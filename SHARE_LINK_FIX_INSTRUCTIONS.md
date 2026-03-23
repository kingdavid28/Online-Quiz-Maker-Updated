# 🔗 Fix Share Link Not Working

## The Problem
When you click a share link (e.g., `/take/quiz-id`), you see "Quiz not found" or the page doesn't load.

## The Solution

### Step 1: Run the SQL Fix
1. Open **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Copy ALL contents from `/FIX_SHARE_LINK.sql`
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)

### Step 2: Reload Schema Cache
1. Still in Supabase Dashboard, go to **Settings** → **API**
2. Scroll down to **"Schema cache"** section
3. Click **"Reload schema"** button
4. Wait 10 seconds

### Step 3: Test Share Link
1. Go to your Dashboard
2. Create or select a quiz
3. Click **"Share"** button
4. The link will be copied to clipboard
5. Open the link in a **new incognito/private window** (to test without auth)
6. You should now see the quiz! ✅

## What This Fix Does

✅ **Enables public access** to quizzes via RLS policies  
✅ **Creates `get_public_quiz()` function** to fetch quiz with questions  
✅ **Allows anonymous users** to take quizzes and submit attempts  
✅ **Fixes database schema** to work with separate questions table  

## Why It Wasn't Working

The old version tried to access the database with Row Level Security (RLS) blocking anonymous users. The new fix:
- Creates policies that allow public read access to quizzes
- Uses a special RPC function that bypasses RLS restrictions
- Properly fetches questions from the separate `questions` table

## Still Not Working?

1. **Check browser console** for errors (F12 → Console tab)
2. **Verify the quiz exists** by checking your dashboard
3. **Make sure you reloaded schema** in Step 2
4. **Try a different browser** to rule out cache issues
