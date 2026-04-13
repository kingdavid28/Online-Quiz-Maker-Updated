# Database Documentation

## 🗄️ Overview

Complete database structure and documentation for the Online Quiz Maker platform.

## 📁 File Structure

### Core Database Files

1. **[01_schema.sql](./01_schema.sql)** - Complete database schema setup
2. **[02_functions.sql](./02_functions.sql)** - RPC functions and stored procedures
3. **[03_migrations.sql](./03_migrations.sql)** - Database migrations and fixes
4. **[04_testing.sql](./04_testing.sql)** - Testing queries and diagnostics
5. **[05_utilities.sql](./05_utilities.sql)** - Utility functions and maintenance tools

## 🚀 Quick Setup

### Step 1: Run Schema Setup
```sql
-- Run this in Supabase SQL Editor
-- File: 01_schema.sql
```

### Step 2: Create Functions
```sql
-- Run after schema setup
-- File: 02_functions.sql
```

### Step 3: Apply Migrations
```sql
-- Run if updating existing database
-- File: 03_migrations.sql
```

### Step 4: Test Everything
```sql
-- Verify setup completed successfully
-- File: 04_testing.sql
```

## 🏗️ Database Schema

### Core Tables

#### `profiles`
User profile extensions for Supabase auth.users
- **id** - UUID (references auth.users)
- **username** - TEXT (unique)
- **full_name** - TEXT
- **avatar_url** - TEXT
- **website** - TEXT

#### `question_bank`
Central repository for reusable questions
- **id** - UUID (primary)
- **user_id** - UUID (foreign key)
- **question_type** - TEXT (multiple_choice, true_false, short_answer)
- **question_text** - TEXT (not null)
- **options** - JSONB (for multiple choice)
- **correct_answer** - TEXT (not null)
- **points** - INTEGER (default 1)
- **tags** - TEXT[]
- **category** - TEXT
- **difficulty** - TEXT (easy, medium, hard)

#### `quizzes`
Main quiz definitions
- **id** - UUID (primary)
- **user_id** - UUID (foreign key)
- **title** - TEXT (not null)
- **description** - TEXT
- **settings** - JSONB (quiz configuration)
- **is_public** - BOOLEAN (default false)
- **share_token** - TEXT (unique)

#### `questions`
Questions within specific quizzes
- **id** - UUID (primary)
- **quiz_id** - UUID (foreign key)
- **question_type** - TEXT (same constraints as question_bank)
- **question_text** - TEXT (not null)
- **options** - JSONB
- **correct_answer** - TEXT (not null)
- **points** - INTEGER (default 1)
- **order_index** - INTEGER (not null)
- **explanation** - TEXT

#### `quiz_attempts`
User quiz submissions
- **id** - UUID (primary)
- **quiz_id** - UUID (foreign key)
- **user_name** - TEXT (not null)
- **user_email** - TEXT (not null)
- **answers** - JSONB (not null)
- **score** - INTEGER (not null)
- **correct_answers** - INTEGER (not null)
- **total_questions** - INTEGER (not null)
- **passed** - BOOLEAN (not null)
- **time_spent** - INTEGER (not null)
- **started_at** - TIMESTAMP
- **completed_at** - TIMESTAMP

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS enabled with these policies:

#### `question_bank`
- Users can only access their own questions
- Full CRUD operations for owners

#### `quizzes`
- Users can access their own quizzes
- Public quizzes are readable by anyone
- Full CRUD for owners

#### `questions`
- Users can access questions from their own quizzes
- Inherited permissions from parent quiz

#### `quiz_attempts`
- Anyone can read attempts (for analytics)
- Anyone can create attempts

### Indexes for Performance

```sql
-- Question Bank Indexes
idx_question_bank_user_id
idx_question_bank_type
idx_question_bank_category
idx_question_bank_created_at

-- Quiz Indexes
idx_quizzes_user_id
idx_quizzes_is_public
idx_quizzes_share_token
idx_quizzes_created_at

-- Question Indexes
idx_questions_quiz_id
idx_questions_order

-- Attempt Indexes
idx_quiz_attempts_quiz_id
idx_quiz_attempts_user_email
idx_quiz_attempts_created_at
```

## 🔧 RPC Functions

### Schema Management
- `refresh_postgrest_schema()` - Refresh schema cache
- `get_schema_info()` - Get schema information

### Question Bank
- `insert_question_direct()` - Direct insert bypassing cache
- `save_question_to_bank()` - Fallback save function
- `get_question_bank_stats()` - Get user statistics

### Quiz Operations
- `create_quiz_with_questions()` - Create quiz with questions
- `get_quiz_with_analytics()` - Get quiz with performance data

### Analytics
- `get_comprehensive_analytics()` - Full quiz analytics
- `get_user_analytics()` - User performance metrics

### Utilities
- `generate_share_token()` - Create shareable quiz link
- `get_public_quiz_by_token()` - Access public quiz
- `health_check()` - Database health status

## 🧪 Testing

### Basic Health Checks
```sql
-- Check table existence and counts
SELECT * FROM health_check();

-- Validate data integrity
SELECT * FROM validate_data_integrity();

-- Test RLS policies
SELECT COUNT(*) FROM question_bank;  -- Should return user's questions
SELECT COUNT(*) FROM quizzes WHERE is_public = true;  -- Should return public quizzes
```

### Performance Testing
```sql
-- Benchmark queries
EXPLAIN ANALYZE SELECT * FROM question_bank WHERE user_id = auth.uid() LIMIT 10;
EXPLAIN ANALYZE SELECT q.*, COUNT(qa.id) FROM quizzes q LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id GROUP BY q.id;
```

### Function Testing
```sql
-- Test question validation
SELECT validate_question_data('multiple_choice', 'Test?', '["A", "B"]', '1');

-- Test analytics
SELECT * FROM get_user_statistics(auth.uid());
```

## 🔧 Maintenance

### Automated Tasks
```sql
-- Clean up old data
SELECT * FROM cleanup_old_attempts(365);

-- Remove orphaned records
SELECT * FROM cleanup_orphaned_data();

-- Optimize performance
SELECT * FROM optimize_database();
```

### Backup and Export
```sql
-- Export user data
SELECT * FROM export_question_bank(auth.uid());
SELECT * FROM export_quizzes(auth.uid());

-- Create backup
SELECT * FROM create_user_backup(auth.uid());
```

## 🚨 Troubleshooting

### Common Issues

#### Schema Cache Problems
```sql
-- Refresh PostgREST schema
SELECT refresh_postgrest_schema();
```

#### Constraint Violations
```sql
-- Check for invalid data
SELECT * FROM validate_data_integrity();

-- Fix invalid question types
UPDATE question_bank SET question_type = 'multiple_choice' WHERE question_type = 'multiple-choice';
```

#### Performance Issues
```sql
-- Check slow queries
SELECT * FROM get_system_statistics();

-- Optimize database
SELECT * FROM optimize_database();
```

#### RLS Policy Issues
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts');

-- Test policies
SELECT COUNT(*) FROM question_bank;  -- Should work for authenticated users
```

## 📊 Monitoring

### Key Metrics
- Total questions in bank
- Quiz creation rate
- Attempt success rate
- Average completion time
- Storage usage

### Health Checks
```sql
-- Database health
SELECT * FROM health_check();

-- System statistics
SELECT * FROM get_system_statistics();

-- User statistics
SELECT * FROM get_user_statistics(auth.uid());
```

## 🔄 Migration Guide

### When to Run Migrations
- After schema changes
- When adding new columns
- When updating constraints
- When optimizing performance

### Migration Process
1. **Backup current data**
2. **Run migration script**
3. **Test functionality**
4. **Monitor performance**

### Rollback Plan
- Keep backup of previous schema
- Test rollback procedures
- Document changes made

## 📋 Best Practices

### Development
- Always test in development first
- Use transactions for complex changes
- Validate data before inserting
- Handle errors gracefully

### Performance
- Use appropriate indexes
- Monitor query performance
- Clean up old data regularly
- Optimize frequently accessed tables

### Security
- Enable RLS on all tables
- Validate user permissions
- Use parameterized queries
- Audit sensitive operations

### Maintenance
- Run regular health checks
- Monitor storage usage
- Clean up orphaned data
- Update statistics regularly

## 🎯 Quick Reference

### Essential Queries
```sql
-- Get user's question bank
SELECT * FROM question_bank WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- Get user's quizzes
SELECT * FROM quizzes WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- Get quiz analytics
SELECT * FROM get_comprehensive_analytics(quiz_id);

-- Check database health
SELECT * FROM health_check();
```

### Common Functions
```sql
-- Save question
SELECT insert_question_direct(user_id, type, question, options, answer, points);

-- Create quiz
SELECT create_quiz_with_questions(user_id, title, description, settings, questions);

-- Generate share link
SELECT generate_share_token(quiz_id);
```

---

## 🎉 Summary

The database is designed for:
- ✅ **Scalability** - Efficient indexing and queries
- ✅ **Security** - RLS policies and validation
- ✅ **Performance** - Optimized for high traffic
- ✅ **Maintainability** - Clear structure and documentation
- ✅ **Extensibility** - Easy to add new features

**Ready for production use!** 🚀
