# Setup Guide

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### Step 1: Clone & Install

```bash
git clone <repository-url>
cd online-quiz-maker
npm install
```

### Step 2: Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note project URL and anon key

2. **Database Schema Setup**
   
   Run these SQL commands in Supabase SQL Editor:

   ```sql
   -- Create question_bank table
   CREATE TABLE IF NOT EXISTS question_bank (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES auth.users(id),
     question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
     question_text TEXT NOT NULL,
     options JSONB,
     correct_answer TEXT NOT NULL,
     points INTEGER DEFAULT 1,
     tags TEXT[],
     category TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create quizzes table
   CREATE TABLE IF NOT EXISTS quizzes (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES auth.users(id),
     title TEXT NOT NULL,
     description TEXT,
     settings JSONB NOT NULL DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create questions table (for quiz questions)
   CREATE TABLE IF NOT EXISTS questions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
     question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
     question_text TEXT NOT NULL,
     options JSONB,
     correct_answer TEXT NOT NULL,
     points INTEGER DEFAULT 1,
     order_index INTEGER NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create quiz_attempts table
   CREATE TABLE IF NOT EXISTS quiz_attempts (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     quiz_id UUID NOT NULL REFERENCES quizzes(id),
     user_name TEXT NOT NULL,
     user_email TEXT NOT NULL,
     answers JSONB NOT NULL,
     score INTEGER NOT NULL,
     correct_answers INTEGER NOT NULL,
     total_questions INTEGER NOT NULL,
     passed BOOLEAN NOT NULL,
     time_spent INTEGER NOT NULL, -- in seconds
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
   ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies
   CREATE POLICY "Users can view own question bank" ON question_bank FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own question bank" ON question_bank FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own question bank" ON question_bank FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can delete own question bank" ON question_bank FOR DELETE USING (auth.uid() = user_id);

   CREATE POLICY "Users can view own quizzes" ON quizzes FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own quizzes" ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own quizzes" ON quizzes FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can delete own quizzes" ON quizzes FOR DELETE USING (auth.uid() = user_id);

   CREATE POLICY "Users can view quiz questions" ON questions FOR SELECT USING (auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id));
   CREATE POLICY "Users can manage quiz questions" ON questions FOR ALL USING (auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id));

   CREATE POLICY "Anyone can view quiz attempts" ON quiz_attempts FOR SELECT;
   CREATE POLICY "Anyone can insert quiz attempts" ON quiz_attempts FOR INSERT;
   ```

3. **Environment Variables**
   ```env
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### Step 3: Local Development

```bash
npm run dev
```

Visit: http://localhost:5173

### Step 4: Database Tables

The app automatically creates these tables:

- `quizzes` - Quiz definitions
- `questions` - Quiz questions (within quizzes)
- `question_bank` - Reusable question library
- `quiz_attempts` - User quiz attempts
- `users` - User profiles

### Step 5: AI Features (Optional)

For AI quiz generation and question assistance:

1. **Get OpenAI API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create account and get API key
   - Add to environment variables

2. **Environment Variables**
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

3. **Test AI Features**
   - Navigate to Quiz Builder
   - Click "AI Generate" button
   - Test question generation

## 🔧 Configuration

### Supabase RLS Policies

Row Level Security is automatically configured:

- Users can only access their own data
- Question bank is user-isolated
- Quiz attempts are private

### Environment Setup

**Development:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Preview:**
```bash
npm run preview
```

## 🐛 Troubleshooting

### Common Issues

**Supabase Connection:**
- Verify project ID and anon key
- Check network connectivity
- Ensure RLS policies are enabled

**Build Errors:**
- Clear node_modules and reinstall
- Check TypeScript configuration
- Verify environment variables

**Runtime Errors:**
- Check browser console
- Verify Supabase connection
- Check authentication status

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('debug', 'true');
```

## 📱 Development Workflow

1. **Feature Development**
   ```bash
   npm run dev
   ```

2. **Testing**
   - Test in local environment
   - Verify database operations
   - Check authentication flow

3. **Build Verification**
   ```bash
   npm run build
   npm run preview
   ```

4. **Deployment**
   ```bash
   npx vercel --prod
   ```

## 🚀 Next Steps

After setup:

1. Create test quizzes
2. Populate question bank
3. Test AI features
4. Verify analytics
5. Deploy to production

## 📞 Support

For issues:
- Check this guide
- Review browser console
- Verify Supabase setup
- Check environment variables
