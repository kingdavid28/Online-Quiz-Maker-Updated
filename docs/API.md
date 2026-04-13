# API Reference

## 🎯 Overview

Complete API documentation for the Online Quiz Maker platform.

## 🔐 Authentication

All API endpoints require authentication via Supabase JWT tokens.

```typescript
// Get user session
const { data: { user }, error } = await supabase.auth.getUser(accessToken);

// Use accessToken for all API calls
```

## 📋 Core Endpoints

### Quiz Management

#### Create Quiz
```typescript
POST /api/quizzes
{
  title: string;
  description?: string;
  questions: Question[];
  settings: QuizSettings;
}

Response:
{
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: QuizSettings;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Get Quiz
```typescript
GET /api/quizzes/:id

Response:
{
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: QuizSettings;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Update Quiz
```typescript
PUT /api/quizzes/:id
{
  title?: string;
  description?: string;
  questions?: Question[];
  settings?: QuizSettings;
}

Response: Updated quiz object
```

#### Delete Quiz
```typescript
DELETE /api/quizzes/:id

Response: { success: true }
```

#### List User Quizzes
```typescript
GET /api/quizzes

Response:
{
  quizzes: Quiz[];
  total: number;
}
```

### Question Bank Management

#### Save Question
```typescript
POST /api/questions
{
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  points?: number;
}

Response:
{
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  points: number;
  createdAt: string;
}
```

#### Get Questions
```typescript
GET /api/questions

Response:
{
  questions: Question[];
  total: number;
}
```

#### Delete Question
```typescript
DELETE /api/questions/:id

Response: { success: true }
```

### Quiz Attempts

#### Submit Quiz Attempt
```typescript
POST /api/quiz-attempts
{
  quizId: string;
  answers: (string | number)[];
  userName: string;
  userEmail: string;
  timeSpent: number;
}

Response:
{
  id: string;
  quizId: string;
  userName: string;
  userEmail: string;
  answers: (string | number)[];
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  timeSpent: number;
  createdAt: string;
}
```

#### Get Quiz Attempts
```typescript
GET /api/quiz-attempts/:quizId

Response:
{
  attempts: QuizAttempt[];
  total: number;
}
```

#### Get User Attempts
```typescript
GET /api/quiz-attempts/user/:userId

Response:
{
  attempts: QuizAttempt[];
  total: number;
}
```

### Analytics

#### Get Quiz Analytics
```typescript
GET /api/analytics/quiz/:quizId

Response:
{
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionStats: QuestionStats[];
  recentAttempts: QuizAttempt[];
}

interface QuestionStats {
  questionId: number;
  correctPercentage: number;
  correctRate: number;
  averageTime: number;
}
```

#### Get User Analytics
```typescript
GET /api/analytics/user/:userId

Response:
{
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  favoriteQuizType: string;
  recentActivity: Activity[];
}
```

## 🤖 AI Features

#### Generate Quiz
```typescript
POST /api/ai/generate-quiz
{
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questionTypes: string[];
}

Response:
{
  title: string;
  description: string;
  questions: Question[];
}
```

#### Generate Questions
```typescript
POST /api/ai/generate-questions
{
  topic: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

Response:
{
  questions: Question[];
}
```

## 📝 Data Types

### Question
```typescript
interface Question {
  id?: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  points?: number;
}
```

### Quiz
```typescript
interface Quiz {
  id: string;
  userId: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: QuizSettings;
  createdAt: string;
  updatedAt: string;
}
```

### QuizSettings
```typescript
interface QuizSettings {
  timeLimit: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  passingScore: number;
}
```

### QuizAttempt
```typescript
interface QuizAttempt {
  id: string;
  quizId: string;
  userName: string;
  userEmail: string;
  answers: (string | number)[];
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  timeSpent: number;
  createdAt: string;
}
```

## 🔧 Error Handling

### Error Response Format
```typescript
{
  error: string;
  code: string;
  details?: any;
}
```

### Common Error Codes

- `AUTH_REQUIRED` - Authentication needed
- `PERMISSION_DENIED` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

### Example Error Handling
```typescript
try {
  const result = await api.createQuiz(quizData);
  return result;
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.error('Invalid data:', error.details);
  } else if (error.code === 'PERMISSION_DENIED') {
    console.error('Access denied');
  } else {
    console.error('Unexpected error:', error);
  }
  throw error;
}
```

## 🌐 Rate Limiting

### Limits
- **Quiz Creation**: 10 per hour per user
- **Question Generation**: 20 per hour per user
- **Quiz Attempts**: 100 per hour per user
- **API Calls**: 1000 per hour per user

### Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 🔍 Pagination

### Query Parameters
```typescript
GET /api/quizzes?page=1&limit=20&sort=createdAt&order=desc
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field
- `order`: Sort order (asc, desc)

### Response Format
```typescript
{
  data: Quiz[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## 🔄 Webhooks

### Quiz Attempt Completed
```typescript
POST https://your-domain.com/webhooks/quiz-completed

{
  event: 'quiz.completed';
  data: {
    quizId: string;
    userId: string;
    attemptId: string;
    score: number;
    passed: boolean;
    timestamp: string;
  };
}
```

### Question Created
```typescript
POST https://your-domain.com/webhooks/question-created

{
  event: 'question.created';
  data: {
    questionId: string;
    userId: string;
    questionType: string;
    timestamp: string;
  };
}
```

## 🧪 Testing

### Development API
```typescript
// Use development endpoint
const API_BASE_URL = 'http://localhost:5173/api';
```

### Test Data
```typescript
// Sample quiz data
const testQuiz = {
  title: 'Test Quiz',
  description: 'A test quiz for development',
  questions: [
    {
      type: 'multiple_choice',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      points: 1
    }
  ],
  settings: {
    timeLimit: null,
    shuffleQuestions: false,
    shuffleAnswers: false,
    showResults: true,
    passingScore: 70
  }
};
```

## 📊 Monitoring

### Health Check
```typescript
GET /api/health

Response:
{
  status: 'healthy';
  timestamp: string;
  version: string;
  database: 'connected';
  services: {
    supabase: 'healthy';
    openai: 'healthy';
  };
}
```

### Metrics
```typescript
GET /api/metrics

Response:
{
  uptime: number;
  requests: number;
  errors: number;
  responseTime: number;
  activeUsers: number;
}
```

---

## 🎉 Summary

This API provides comprehensive functionality for:

- ✅ **Quiz Management** - Create, update, delete quizzes
- ✅ **Question Bank** - Save and reuse questions
- ✅ **Quiz Attempts** - Track user performance
- ✅ **Analytics** - Detailed performance insights
- ✅ **AI Features** - Generate content with AI
- ✅ **Error Handling** - Robust error management
- ✅ **Rate Limiting** - Fair usage policies
- ✅ **Webhooks** - Real-time event notifications

**Start building with the API today!** 🚀
