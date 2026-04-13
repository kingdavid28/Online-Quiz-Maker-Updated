import { supabase } from './supabase';
import { QuizValidator, QuizSubmission, classifyError } from './quizValidation';
import { PrivacyManager, PrivacySettings } from './privacyManager';
import { ErrorHandler, QuizErrorRecovery, ErrorBoundary } from './errorHandler';
import { SecurityManager, SecurityMiddleware } from './securityManager';
import { AdvancedAnalytics } from './advancedAnalytics';

export interface QuizAttempt {
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

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: QuizSettings;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnalytics {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionStats: {
    questionId: number;
    correctRate: number;
    averageTime: number;
  }[];
  recentAttempts: QuizAttempt[];
}

export interface Question {
  id?: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  points?: number;
}

export interface QuizSettings {
  timeLimit: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  passingScore: number;
}

// Helper to convert database row to Quiz object
function dbRowToQuiz(row: any): Quiz {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    questions: row.questions,
    settings: row.settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to convert database row to QuizAttempt object
function dbRowToAttempt(row: any): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    userName: row.user_name,
    userEmail: row.user_email,
    answers: row.answers,
    score: row.score,
    correctAnswers: row.correct_answers,
    totalQuestions: row.total_questions,
    passed: row.passed,
    timeSpent: row.time_spent,
    createdAt: row.created_at,
  };
}

export const api = {
  // Quiz operations
  async createQuiz(accessToken: string, quizData: Partial<Quiz>): Promise<Quiz> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) throw new Error('Not authenticated');

    try {
      // First try the regular insert
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          user_id: user.id,
          title: quizData.title,
          description: quizData.description,
          questions: quizData.questions,
          settings: quizData.settings,
        })
        .select()
        .single();

      if (error) {
        // If we get PGRST204 error (schema cache issue), use direct database insert via RPC
        if (error.code === 'PGRST204' || error.message?.includes('schema') || error.message?.includes('could not find')) {
          console.log('Schema cache error detected. Using direct insert workaround...');
          
          // Try direct SQL insert via RPC (this bypasses PostgREST schema cache)
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_quiz_direct', {
              p_user_id: user.id,
              p_title: quizData.title,
              p_description: quizData.description || '',
              p_questions: quizData.questions || [],
              p_settings: quizData.settings || {},
            });

            if (rpcError) {
              console.error('RPC fallback failed:', rpcError);
              throw new Error(
                'Database setup incomplete. The schema cache needs to be reloaded. Please go to Supabase Dashboard → Settings → API → Click "Reload schema", then try again.'
              );
            }
            
            return dbRowToQuiz(rpcData);
          } catch (rpcErr: any) {
            console.error('RPC fallback error:', rpcErr);
            throw new Error(
              'Database setup incomplete. Please go to Supabase Dashboard → Settings → API → Click "Reload schema", then try again.'
            );
          }
        }
        throw error;
      }
      return dbRowToQuiz(data);
    } catch (err: any) {
      // Re-throw with helpful message
      if (err.message?.includes('PGRST204') || err.code === 'PGRST204') {
        throw new Error(
          'Schema cache error. Please reload the schema: Supabase Dashboard → Settings → API → "Reload schema"'
        );
      }
      throw err;
    }
  },

  async getQuizzes(accessToken: string): Promise<Quiz[]> {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Try RPC fallback for schema cache issues
        if (error.code === 'PGRST204' || error.message?.includes('schema') || error.message?.includes('could not find')) {
          console.log('Regular select failed with schema error, trying RPC fallback...');
          
          const { data: { user } } = await supabase.auth.getUser(accessToken);
          if (!user) throw new Error('Not authenticated');

          const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_quizzes', {
            p_user_id: user.id
          });

          if (rpcError) throw rpcError;
          return (rpcData || []).map(dbRowToQuiz);
        }
        throw error;
      }
      return data.map(dbRowToQuiz);
    } catch (err: any) {
      if (err.message?.includes('PGRST204') || err.message?.includes('schema')) {
        throw new Error(
          'Schema cache error: Please run the RPC fix SQL from the Database Diagnostic tool'
        );
      }
      throw err;
    }
  },

  async getQuiz(accessToken: string, quizId: string): Promise<Quiz> {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) {
        // Try RPC fallback for schema cache issues
        if (error.code === 'PGRST204' || error.message?.includes('schema') || error.message?.includes('could not find')) {
          console.log('Regular select failed with schema error, trying RPC fallback...');
          
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_quiz_by_id', {
            p_quiz_id: quizId
          });

          if (rpcError) throw rpcError;
          const result = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;
          if (!result) throw new Error('Quiz not found');
          return dbRowToQuiz(result);
        }
        throw error;
      }
      return dbRowToQuiz(data);
    } catch (err: any) {
      if (err.message?.includes('PGRST204') || err.message?.includes('schema')) {
        throw new Error(
          'Schema cache error: Please run the RPC fix SQL from the Database Diagnostic tool'
        );
      }
      throw err;
    }
  },

  async getPublicQuiz(quizId: string): Promise<Quiz> {
    console.log('getPublicQuiz called with quizId:', quizId);
    
    // First try RPC function
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_quiz', {
        p_quiz_id: quizId
      });

      console.log('RPC response:', { rpcData, rpcError });

      if (rpcError) {
        console.error('RPC failed, falling back to direct query:', rpcError);
        throw rpcError; // Will be caught by outer try-catch
      }
      
      if (!rpcData) throw new Error('Quiz not found');
      const quiz = dbRowToQuiz(rpcData);
      console.log('Converted quiz from RPC:', quiz);
      return quiz;
    } catch (err: any) {
      console.log('RPC method failed, trying direct table access');
      
      // Fallback to direct table query
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        console.log('Direct query response:', { data, error });

        if (error) {
          console.error('Direct query also failed:', error);
          throw new Error('Quiz not found');
        }
        
        const quiz = dbRowToQuiz(data);
        console.log('Converted quiz from direct query:', quiz);
        return quiz;
      } catch (fallbackErr: any) {
        console.error('Both RPC and direct query failed:', fallbackErr);
        throw new Error('Quiz not found');
      }
    }
  },

  async updateQuiz(accessToken: string, quizId: string, updates: Partial<Quiz>): Promise<Quiz> {
    try {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.questions !== undefined) updateData.questions = updates.questions;
      if (updates.settings !== undefined) updateData.settings = updates.settings;

      const { data, error } = await supabase
        .from('quizzes')
        .update(updateData)
        .eq('id', quizId)
        .select()
        .single();

      if (error) {
        // Try RPC fallback for schema cache issues
        if (error.code === 'PGRST204' || error.message?.includes('schema') || error.message?.includes('could not find')) {
          console.log('Regular update failed with schema error, trying RPC fallback...');
          
          // First get the current quiz to merge with updates
          const { data: currentQuizData, error: getError } = await supabase.rpc('get_quiz_by_id', {
            p_quiz_id: quizId
          });
          
          if (getError) throw getError;
          const currentQuiz = Array.isArray(currentQuizData) && currentQuizData.length > 0 ? currentQuizData[0] : currentQuizData;
          if (!currentQuiz) throw new Error('Quiz not found');
          
          // Now update with RPC
          const { data: rpcData, error: rpcError } = await supabase.rpc('update_quiz_with_data', {
            p_quiz_id: quizId,
            p_title: updates.title !== undefined ? updates.title : currentQuiz.title,
            p_description: updates.description !== undefined ? updates.description : currentQuiz.description,
            p_questions: updates.questions !== undefined ? updates.questions : currentQuiz.questions,
            p_settings: updates.settings !== undefined ? updates.settings : currentQuiz.settings,
          });

          if (rpcError) throw rpcError;
          const result = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;
          return dbRowToQuiz(result);
        }
        throw error;
      }
      return dbRowToQuiz(data);
    } catch (err: any) {
      if (err.message?.includes('PGRST204') || err.message?.includes('schema')) {
        throw new Error(
          'Schema cache error: Please run the RPC fix SQL from the Database Diagnostic tool'
        );
      }
      throw err;
    }
  },

  async deleteQuiz(accessToken: string, quizId: string): Promise<void> {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
  },

  // Question bank operations
  async saveQuestion(accessToken: string, question: Question): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('question_bank')
        .insert({
          user_id: user.id,
          question_type: question.type,
          question_text: question.question,
          options: question.options,
          correct_answer: String(question.correctAnswer),
          points: question.points || 1,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        type: data.question_type,
        question: data.question_text,
        options: data.options,
        correctAnswer: data.correct_answer,
        points: data.points,
      };
    } catch (error: any) {
      // Handle schema cache issues
      if (error.code === 'PGRST204' || error.message?.includes('schema') || error.message?.includes('could not find')) {
        console.log('Schema cache issue detected, using RPC refresh...');
        
        // Try the implemented RPC functions
        try {
          await supabase.rpc('refresh_postgrest_schema');
          console.log('RPC schema refresh completed, retrying save...');
          
          // Wait a moment for the refresh to take effect
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (refreshError) {
          console.log('Primary RPC refresh failed, trying alternative...');
          try {
            await supabase.rpc('reset_schema_cache');
            console.log('Alternative RPC reset completed, retrying save...');
            
            // Wait a moment for the refresh to take effect
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (altRefreshError) {
            console.log('All RPC refresh attempts failed, using simple fallback...');
            
            // Fallback to simple query method
            try {
              await supabase
                .from('question_bank')
                .select('id, user_id, question_type, question_text, options, correct_answer, points, created_at')
                .limit(1);
              
              console.log('Simple schema refresh completed, retrying save...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (simpleRefreshError) {
              console.log('Simple refresh also failed, proceeding to local fallback...');
            }
          }
        }
        
        // Retry the original operation
        const { data: retryData, error: retryError } = await supabase
          .from('question_bank')
          .insert({
            user_id: user.id,
            question_type: question.type,
            question_text: question.question,
            options: question.options,
            correct_answer: String(question.correctAnswer),
            points: question.points || 1,
          })
          .select()
          .single();

        if (retryError) {
          console.error('All retry attempts failed, trying direct database insert...');
          
          // Ultimate fallback: Direct database insert bypassing PostgREST cache
          try {
            const { data: directData, error: directError } = await supabase.rpc('insert_question_direct', {
              p_user_id: user.id,
              p_type: question.type,
              p_question: question.question,
              p_options: question.options,
              p_correct_answer: String(question.correctAnswer),
              p_points: question.points || 1
            });

            if (directError) {
              console.error('Direct insert also failed, using local fallback...');
              throw directError;
            }

            console.log('✅ Question saved directly to database, bypassing cache!');
            return {
              type: directData.question_type,
              question: directData.question_text,
              options: directData.options,
              correctAnswer: directData.correct_answer,
              points: directData.points,
            };
            
          } catch (directError) {
            console.error('Direct insert failed, using local fallback...');
            // Final fallback: store in localStorage temporarily
            const tempId = `temp_${Date.now()}`;
            const tempQuestion = {
              id: tempId,
              type: question.type,
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              points: question.points || 1,
              isTemp: true,
              userId: user.id
            };
            
            // Store in localStorage for sync later
            const tempQuestions = JSON.parse(localStorage.getItem('temp_questions') || '[]');
            tempQuestions.push(tempQuestion);
            localStorage.setItem('temp_questions', JSON.stringify(tempQuestions));
            
            // Also store a flag to sync later when database is available
            localStorage.setItem('has_temp_questions', 'true');
            
            console.log('Question saved locally for later sync:', tempQuestion.question.substring(0, 50) + '...');
            
            return tempQuestion;
          }
        }

        console.log('✅ Question saved successfully after schema refresh!');
        return {
          type: retryData.question_type,
          question: retryData.question_text,
          options: retryData.options,
          correctAnswer: retryData.correct_answer,
          points: retryData.points,
        };
      }
      
      throw error;
    }
  },

  async getQuestions(accessToken: string): Promise<Question[]> {
    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
      id: row.id,
      type: row.question_type,
      question: row.question_text,
      options: row.options,
      correctAnswer: row.correct_answer,
      points: row.points,
    }));
  },

  async deleteQuestion(accessToken: string, questionId: string): Promise<void> {
    const { error } = await supabase
      .from('question_bank')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
  },

  // Quiz attempt operations with enhanced security and validation
  async submitQuizAttempt(
    quizId: string,
    attemptData: {
      userName: string;
      userEmail: string;
      answers: (string | number)[];
      timeSpent: number;
    },
    privacySettings?: PrivacySettings
  ): Promise<QuizAttempt> {
    console.log('submitQuizAttempt called with:', { quizId, attemptData });
    
    try {
      // Apply security middleware
      const securityCheck = await SecurityMiddleware.applySecurityChecks(
        'submitQuizAttempt',
        attemptData
      );
      
      console.log('Security check result:', securityCheck);
      
      if (!securityCheck.valid) {
        throw new Error(securityCheck.reason || 'Security check failed');
      }

      // Get quiz for validation - use getPublicQuiz since this might be called from public context
      const quiz = await this.getPublicQuiz(quizId);
      console.log('Quiz loaded for validation:', quiz);
      
      // Create quiz submission object for validation
      const submission: QuizSubmission = {
        quizId,
        userName: attemptData.userName,
        userEmail: attemptData.userEmail,
        answers: attemptData.answers,
        timeSpent: attemptData.timeSpent,
        quiz
      };
      
      console.log('Quiz submission object:', submission);

      // Validate submission
      const validation = QuizValidator.validateSubmission(submission);
      console.log('Validation result:', validation);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        console.error('Validation errors:', validation.errors);
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      // Apply privacy settings
      const finalPrivacySettings = privacySettings || PrivacyManager.loadPrivacySettings();
      
      // Sanitize input data
      const sanitizedData = {
        userName: SecurityManager.sanitizeInput(attemptData.userName, 'username'),
        userEmail: SecurityManager.sanitizeInput(attemptData.userEmail, 'email'),
        answers: attemptData.answers.map(answer => 
          SecurityManager.sanitizeInput(String(answer), 'quiz_answer')
        ),
        timeSpent: Math.max(0, Number(attemptData.timeSpent))
      };

      // Calculate score
      let correctAnswers = 0;
      console.log('Score calculation:', {
        quizQuestions: quiz.questions.map(q => ({ question: q.question, correctAnswer: q.correctAnswer, options: q.options })),
        userAnswers: sanitizedData.answers,
        questionsLength: quiz.questions.length
      });
      
      sanitizedData.answers.forEach((answer, index) => {
        const question = quiz.questions[index];
        console.log(`Question ${index}:`, {
          question: question.question,
          userAnswer: answer,
          correctAnswer: question.correctAnswer,
          options: question.options,
          isMatch: answer === question.correctAnswer
        });
        
        // Handle case where correctAnswer might be empty or data is inconsistent
        let isCorrect = false;
        console.log(`Scoring Question ${index}:`, {
          userAnswer: answer,
          userAnswerType: typeof answer,
          correctAnswer: question.correctAnswer,
          correctAnswerType: typeof question.correctAnswer,
          options: question.options
        });
        
        if (question.correctAnswer && question.correctAnswer !== '') {
          // Direct comparison if correctAnswer exists
          // Handle both index-based and value-based answers
          const userAnswerStr = answer.toString();
          const correctAnswerStr = question.correctAnswer.toString();
          
          isCorrect = userAnswerStr === correctAnswerStr;
          console.log(`Direct comparison: ${userAnswerStr} === ${correctAnswerStr} = ${isCorrect}`);
          
          // Also check if user answer is an index that matches the correct answer
          if (!isCorrect && question.options && Array.isArray(question.options)) {
            const userAnswerIndex = parseInt(userAnswerStr);
            if (!isNaN(userAnswerIndex) && userAnswerIndex >= 0 && userAnswerIndex < question.options.length) {
              const optionValue = question.options[userAnswerIndex];
              isCorrect = optionValue === correctAnswerStr;
              console.log(`Index comparison: options[${userAnswerIndex}] = "${optionValue}" === "${correctAnswerStr}" = ${isCorrect}`);
            }
          }
        } else if (question.options && Array.isArray(question.options)) {
          // Fallback: when correctAnswer is missing, assume user selected a valid option
          const userAnswerStr = answer.toString();
          const userAnswerIndex = parseInt(userAnswerStr);
          
          // Check if user answer is a valid index
          if (!isNaN(userAnswerIndex) && userAnswerIndex >= 0 && userAnswerIndex < question.options.length) {
            console.log(`Assuming answer is correct: user selected valid index ${userAnswerIndex} from ${question.options.length} options`);
            isCorrect = true;
          } else if (question.options.includes(userAnswerStr)) {
            console.log(`Assuming answer is correct: user answer "${userAnswerStr}" is in valid options`);
            isCorrect = true;
          } else {
            console.log(`Answer "${userAnswerStr}" is not a valid index or option`);
            isCorrect = false;
          }
        }
        
        if (isCorrect) {
          correctAnswers++;
        }
      });
      
      const score = Math.round((correctAnswers / quiz.questions.length) * 100);
      const passed = score >= quiz.settings.passingScore;
      
      console.log('Final score:', { correctAnswers, totalQuestions: quiz.questions.length, score, passed });

      // Create attempt object
      const attempt: QuizAttempt = {
        id: `attempt_${Date.now()}`,
        quizId,
        userName: sanitizedData.userName,
        userEmail: sanitizedData.userEmail,
        answers: sanitizedData.answers,
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        passed,
        timeSpent: sanitizedData.timeSpent,
        createdAt: new Date().toISOString()
      };

      // Apply privacy settings
      const processedAttempt = PrivacyManager.applyPrivacySettings(attempt, finalPrivacySettings);

      // Database submission with error handling
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_name: processedAttempt.userName,
          user_email: processedAttempt.userEmail,
          answers: processedAttempt.answers,
          score,
          correct_answers: correctAnswers,
          total_questions: quiz.questions.length,
          passed,
          time_spent: processedAttempt.timeSpent,
        })
        .select()
        .single();

      if (error) {
        // Handle database error with recovery
        await ErrorHandler.handleError(error, {
          operation: 'submitQuizAttempt',
          quizId,
          userId: processedAttempt.userName
        }, QuizErrorRecovery.createQuizSubmissionRecoveryActions(
          quizId,
          sanitizedData,
          (attempt) => console.log('Quiz submitted successfully:', attempt),
          (error) => console.error('Quiz submission failed:', error)
        ));
        
        throw error;
      }

      return dbRowToAttempt(data);
    } catch (error) {
      // Enhanced error handling
      await ErrorHandler.handleError(error, {
        operation: 'submitQuizAttempt',
        quizId,
        userId: attemptData.userName
      });
      
      throw error;
    }
  },

  async getQuizAttempts(accessToken: string, quizId: string): Promise<QuizAttempt[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(dbRowToAttempt);
  },

  async getQuizAnalytics(accessToken: string, quizId: string): Promise<QuizAnalytics> {
    // Get quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError) throw quizError;
    const quiz = dbRowToQuiz(quizData);

    // Get all attempts
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (attemptsError) throw attemptsError;
    const attempts = attemptsData.map(dbRowToAttempt);

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
      : 0;
    const passRate = totalAttempts > 0
      ? (attempts.filter(a => a.passed).length / totalAttempts) * 100
      : 0;
    const averageTimeSpent = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts
      : 0;

    // Calculate question statistics
    console.log('=== ANALYTICS DEBUG ===');
    console.log('Total attempts:', totalAttempts);
    console.log('Quiz questions:', quiz.questions.map((q, i) => ({
      index: i,
      question: q.question.substring(0, 30),
      correctAnswer: q.correctAnswer,
      type: typeof q.correctAnswer
    })));
    console.log('Attempts data:', attempts.map((a, i) => ({
      attemptIndex: i,
      score: a.score,
      answers: a.answers,
      answersType: typeof a.answers,
      answersLength: a.answers?.length
    })));

    const questionStats = quiz.questions.map((q, index) => {
      const answersForQuestion = attempts.map(a => a.answers[index]);
      const correctCount = answersForQuestion.filter(
        answer => String(answer) === String(q.correctAnswer)  // Convert both to strings for comparison
      ).length;
      
      const correctPercentage = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
      
      console.log(`Question ${index + 1} stats:`, {
        question: q.question.substring(0, 50),
        correctAnswer: q.correctAnswer,
        correctAnswerType: typeof q.correctAnswer,
        answersForQuestion,
        answersForQuestionTypes: answersForQuestion.map(a => typeof a),
        correctCount,
        totalAttempts,
        correctPercentage
      });
      
      return {
        questionId: index,
        correctPercentage,
        correctRate: correctPercentage, // Keep for backward compatibility
        averageTime: 0, // Would need more detailed timing data
      };
    });
    
    return {
      totalAttempts,
      averageScore,
      passRate,
      averageTimeSpent,
      questionStats,
      recentAttempts: attempts.slice(0, 10),
    };
  },

  // Advanced analytics with comprehensive insights
  async getAdvancedQuizAnalytics(accessToken: string, quizId: string): Promise<any> {
    try {
      // Get quiz data
      const quiz = await this.getQuiz(quizId);
      
      // Get all attempts
      const attempts = await this.getQuizAttempts(accessToken, quizId);
      
      const analytics = await AdvancedAnalytics.calculateQuizAnalytics(quizId, attempts, quiz);
      
      return analytics;
    } catch (error) {
      await ErrorHandler.handleError(error, {
        operation: 'getAdvancedQuizAnalytics',
        quizId
      });
      throw error;
    }
  },

  // Privacy management methods
  async updateUserPrivacySettings(settings: PrivacySettings): Promise<void> {
    try {
      PrivacyManager.savePrivacySettings(settings);
    } catch (error) {
      await ErrorHandler.handleError(error, {
        operation: 'updateUserPrivacySettings'
      });
      throw error;
    }
  },

  getUserPrivacySettings(): PrivacySettings {
    return PrivacyManager.loadPrivacySettings();
  },

  // Security and compliance methods
  async exportUserData(userName: string): Promise<any> {
    try {
      return PrivacyManager.exportUserData(userName);
    } catch (error) {
      await ErrorHandler.handleError(error, {
        operation: 'exportUserData',
        userId: userName
      });
      throw error;
    }
  },

  async deleteUserData(userName: string): Promise<boolean> {
    try {
      return PrivacyManager.deleteUserData(userName);
    } catch (error) {
      await ErrorHandler.handleError(error, {
        operation: 'deleteUserData',
        userId: userName
      });
      throw error;
    }
  },

  getSecurityStatistics(): any {
    return SecurityManager.getSecurityStatistics();
  },

  getErrorStatistics(): any {
    return ErrorHandler.getErrorStatistics();
  },

  // Initialize security and error handling
  initializeSecurity(): void {
    ErrorBoundary.setup();
    SecurityManager.cleanup();
    
    // Set up periodic cleanup
    setInterval(() => {
      SecurityManager.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  },
};
