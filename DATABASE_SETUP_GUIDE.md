# Quizify Database Setup Guide

## Quick Fix for "Could not find the table 'public.quizzes' in the schema cache" Error

If you're seeing this error, it means your Supabase database needs to be initialized with the required tables. Don't worry - this is a one-time setup that takes less than 2 minutes!

## Automatic Setup Screen

When you see this error, Quizify will automatically display a setup screen with step-by-step instructions. Simply follow the on-screen prompts.

## Manual Setup Instructions

If you prefer to set up manually:

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your Quizify project (`lqgtjmndgfuyabnghgdy`)
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy the SQL Schema

The SQL schema is located in `/supabase/schema.sql` in this project. Copy the entire contents of that file.

Alternatively, use this link to open the file directly:
- [View schema.sql](/supabase/schema.sql)

### Step 3: Execute the SQL

1. Paste the SQL schema into the Supabase SQL Editor
2. Click **Run** (or press `Ctrl/Cmd + Enter`)
3. Wait for the success confirmation

### Step 4: Verify Tables Were Created

1. Go to **Table Editor** in the Supabase sidebar
2. You should see three new tables:
   - `quizzes` - Stores quiz data
   - `questions` - Stores question bank
   - `quiz_attempts` - Stores quiz attempt results

### Step 5: Refresh Your App

Reload the Quizify application and the error should be gone!

## What the SQL Schema Does

The schema creates:

1. **Database Tables:**
   - `quizzes` - Main quiz storage with settings and questions
   - `questions` - Question bank for reusable questions
   - `quiz_attempts` - Analytics data for quiz submissions

2. **Security (Row Level Security):**
   - Users can only view/edit their own quizzes
   - Anyone with a link can take a quiz (anonymous)
   - Only quiz creators can view analytics

3. **Performance Indexes:**
   - Optimized queries for user lookups
   - Fast quiz retrieval by date

4. **Automatic Timestamps:**
   - Auto-updates `updated_at` when quizzes are modified

## Troubleshooting

### Error: "relation 'auth.users' does not exist"
This shouldn't happen with Supabase, but if it does, make sure you're using the Supabase auth system (not custom auth).

### Error: "extension 'uuid-ossp' already exists"
This is fine - the `CREATE EXTENSION IF NOT EXISTS` statement will skip it.

### Still seeing the schema cache error after running SQL?
1. Make sure the SQL executed successfully (check for green success message)
2. Wait 10-30 seconds for Supabase to update its cache
3. Hard refresh the page (`Ctrl/Cmd + Shift + R`)
4. Check the Supabase Table Editor to confirm tables exist

## Need Help?

If you continue to have issues:
1. Check the Supabase dashboard for any error messages
2. Verify your Supabase project is active and not paused
3. Make sure you're logged into the correct Supabase account
4. Review the `/SUPABASE_SETUP.md` file for additional setup details
