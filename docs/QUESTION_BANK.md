# Question Bank System

## 🎯 Overview

Centralized question management system for saving, organizing, and reusing questions across multiple quizzes.

## 📋 Features

### Core Functionality
- ✅ **Save Questions** - Store questions with full metadata
- ✅ **Browse & Search** - Find questions by text or type
- ✅ **Multi-Select** - Select multiple questions at once
- ✅ **Reuse Questions** - Add questions to different quizzes
- ✅ **Track Usage** - Monitor question performance

### Question Types Supported
- **Multiple Choice** - Multiple options with single correct answer
- **True/False** - Binary choice questions
- **Short Answer** - Text-based answers

## 🚀 How to Use

### Step 1: Save Questions to Bank

1. **Navigate to Question Bank** from dashboard
2. **Click "Add Question"**
3. **Fill Question Details:**
   - Select question type
   - Enter question text
   - Add answer options (for Multiple Choice)
   - Mark correct answer
   - Set point value
4. **Save Question**

### Step 2: Browse Question Bank

1. **In Quiz Builder**, click **"Browse Question Bank"**
2. **Search questions** using search bar
3. **Filter by type** using dropdown
4. **Preview questions** with full details

### Step 3: Add Questions to Quiz

1. **Select questions** using checkboxes
2. **Review selection** in summary bar
3. **Click "Add to Quiz"**
4. **Questions added** with unique IDs

## 🏗️ Technical Details

### Database Schema

```sql
CREATE TABLE question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

**Save Question:**
```typescript
POST /api/questions
{
  type: 'multiple_choice' | 'true_false' | 'short_answer',
  question: string,
  options?: string[],
  correctAnswer: string | number,
  points?: number
}
```

**Get Questions:**
```typescript
GET /api/questions
// Returns user's questions ordered by created_at DESC
```

**Delete Question:**
```typescript
DELETE /api/questions/:id
```

## 🎨 UI Components

### QuestionBankBrowser

**Props:**
```typescript
interface QuestionBankBrowserProps {
  onQuestionsSelected: (questions: Question[]) => void;
  maxQuestions?: number;
}
```

**Features:**
- Modal dialog interface
- Real-time search filtering
- Type-based filtering
- Checkbox selection
- Selection summary
- Question preview cards

### Integration Points

**QuizBuilder:**
- Primary button in question creation area
- Handles unique ID generation
- Seamless workflow integration

**Dashboard:**
- Quick access to question bank
- Recent questions display
- Question statistics

## 🔧 Best Practices

### Question Organization

**Use Categories:**
- Group by subject (Math, Science, History)
- Use descriptive naming
- Maintain consistency

**Tag Questions:**
- Add relevant tags (difficulty, topic)
- Use consistent tag format
- Enable better searching

**Points Allocation:**
- Assign appropriate difficulty-based points
- Use standard scales (1, 2, 3, 5)
- Consider question complexity

### Question Quality

**Clear Wording:**
- Write unambiguous questions
- Avoid confusing phrasing
- Test for clarity

**Proper Formatting:**
- Consistent option formatting
- Clear correct answer marking
- Proper punctuation

**Regular Review:**
- Periodically update questions
- Remove outdated content
- Improve question quality

## 📊 Analytics Integration

### Performance Tracking

**Usage Metrics:**
- Question usage frequency
- Success rates across quizzes
- Average completion time

**Quality Metrics:**
- Question difficulty analysis
- Common wrong answers
- Performance by type

### Data Insights

**Question Effectiveness:**
- Identify high-performing questions
- Find consistently difficult questions
- Optimize question selection

**User Behavior:**
- Track question selection patterns
- Analyze type preferences
- Monitor engagement metrics

## 🔐 Security

### Row Level Security

**User Isolation:**
- Users only access their own questions
- `user_id` based filtering
- Secure API endpoints

**Data Protection:**
- Authentication required
- Token-based access
- Input validation

## 🚀 Advanced Features

### Search Capabilities

**Full-Text Search:**
- Question text search
- Option content search
- Real-time filtering

**Smart Filtering:**
- Type-based filtering
- Point value filtering
- Date-based filtering

### Bulk Operations

**Multi-Select:**
- Checkbox selection
- Selection limits
- Bulk add operations

**Import/Export:**
- CSV import support
- Export for backup
- Template libraries

## 🐛 Troubleshooting

### Common Issues

**Questions Not Saving:**
- Check authentication status
- Verify required fields
- Check type constraints

**Search Not Working:**
- Verify network connection
- Check browser console
- Ensure questions exist

**Selection Issues:**
- Check maxQuestions limit
- Verify unique IDs
- Refresh and retry

### Debug Mode

```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');
```

## 📈 Future Enhancements

### Planned Features

**Advanced Search:**
- Tag-based filtering
- Category browsing
- Advanced filters

**Collaboration:**
- Share question banks
- Community libraries
- Rating system

**AI Integration:**
- Difficulty prediction
- Quality scoring
- Smart suggestions

---

## 🎉 Summary

The Question Bank System provides efficient question management with:

- ✅ **Time Savings** - Reuse questions across quizzes
- ✅ **Consistency** - Maintain quality standards  
- ✅ **Organization** - Centralized question library
- ✅ **Analytics** - Track question performance
- ✅ **Scalability** - Grow question library over time

**Get started building your question library today!** 🚀
