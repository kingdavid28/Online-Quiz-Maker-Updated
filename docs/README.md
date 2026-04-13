# Online Quiz Maker - Complete Documentation

## 🎯 Overview

A comprehensive quiz-making platform with AI-powered question generation, question bank management, and detailed analytics.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
npx vercel --prod
```

## 📋 Key Features

- ✅ **AI Quiz Generation** - Create quizzes with AI assistance
- ✅ **Question Bank** - Save and reuse questions across quizzes
- ✅ **Multiple Question Types** - Multiple Choice, True/False, Short Answer
- ✅ **Real-time Analytics** - Track quiz performance and question difficulty
- ✅ **Drag & Drop Interface** - Intuitive quiz building experience
- ✅ **User Authentication** - Secure user management
- ✅ **Responsive Design** - Works on all devices

## 🏗️ Architecture

**Frontend:** React + TypeScript + Tailwind CSS
**Backend:** Supabase (PostgreSQL + Auth + Real-time)
**Deployment:** Vercel
**AI:** OpenAI API integration

## 📚 Documentation Structure

1. **[Setup Guide](./SETUP.md)** - Installation and configuration
2. **[Question Bank Guide](./QUESTION_BANK.md)** - Managing and reusing questions
3. **[API Reference](./API.md)** - Complete API documentation
4. **[Database Schema](./DATABASE.md)** - Database structure and relationships
5. **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment

## 🗄️ Database Schema

### Core Tables

**question_bank**
```sql
CREATE TABLE question_bank (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**quizzes**
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**questions**
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL
);
```

**quiz_attempts**
```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL
);
```

### Relationships

- **Users** → **quizzes** (one-to-many)
- **Users** → **question_bank** (one-to-many)
- **quizzes** → **questions** (one-to-many)
- **quizzes** → **quiz_attempts** (one-to-many)

### Security

All tables have Row Level Security (RLS) enabled:
- Users can only access their own data
- Quiz attempts are publicly readable for analytics
- Questions inherit permissions from parent quiz

## 🎨 Components

- **QuizBuilder** - Create and edit quizzes
- **QuestionBank** - Manage question library
- **QuizAnalytics** - View performance metrics
- **AIGenerator** - AI-powered quiz creation
- **QuizTaker** - Take quizzes with real-time feedback

## 🔧 Environment Variables

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_OPENAI_API_KEY=your_openai_key
```

## 🌐 Live Demo

[https://online-quiz-maker-delta.vercel.app](https://online-quiz-maker-delta.vercel.app)

## 📄 License

MIT License - see LICENSE file for details
