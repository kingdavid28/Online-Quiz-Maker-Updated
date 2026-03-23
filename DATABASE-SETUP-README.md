# Quizify Database Setup Instructions

Your Quizify app is experiencing errors because the Supabase database tables haven't been created yet, or the schema is outdated. Follow these simple steps to set up your database:

## For New Setup (First Time)

### Quick Setup (2 minutes)

### Step 1: Copy the SQL Schema
Open the `database-setup.sql` file in this project and copy all the SQL code.

### Step 2: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New query" button

### Step 3: Run the SQL
1. Paste the copied SQL schema into the editor
2. Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
3. Wait for the success message: "Success. No rows returned"

### Step 4: Refresh Your App
Once the SQL has executed successfully, refresh your Quizify application. All errors should be resolved!

---

## For Existing Setup (Migration)

If you already ran the old database setup and are getting errors about missing columns like "questions" or "settings", you need to migrate:

### Migration Steps

1. **IMPORTANT: Backup your data first!** (if you have important quizzes)
2. Open the `database-migration.sql` file
3. Copy all the SQL code
4. Open Supabase SQL Editor
5. Paste and run the migration SQL
6. Wait for success message
7. Refresh your Quizify application

**Note:** The migration will drop the old `questions` table (if it exists) and update the `quizzes` table to store questions as JSONB.

---

## What This SQL Does

The SQL script creates the following tables:

- **profiles** - User profile information
- **quizzes** - Quiz definitions and settings
- **questions** - Individual questions within quizzes
- **quiz_attempts** - Records of completed quiz attempts
- **question_bank** - Reusable questions library

It also sets up:
- Row Level Security (RLS) policies to protect user data
- Database indexes for better performance
- Automatic timestamp updates

---

## Troubleshooting

**Error: "relation already exists"**
- This is fine! It means some tables were already created. The script uses `IF NOT EXISTS` so it's safe to run multiple times.

**Error: "permission denied"**
- Make sure you're logged into Supabase as the project owner
- Check that you have the correct project selected

**Error: "uuid-ossp extension not found"**
- This is normal - the SQL will create it automatically

---

## Alternative: Use Supabase Dashboard UI

If you prefer, you can also set up tables using the Supabase Table Editor:
1. Go to "Table Editor" in your Supabase dashboard
2. However, using the SQL script is much faster and ensures all policies are set correctly!

---

## Need Help?

If you encounter any issues:
1. Make sure your Supabase project is active
2. Verify your API keys are correct in your environment
3. Check the Supabase dashboard logs for detailed error messages