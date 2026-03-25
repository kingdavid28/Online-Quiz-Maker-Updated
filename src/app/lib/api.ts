import { supabase, hasSupabaseCredentials } from './supabase';
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
  type: 'multiple-choice' | 'true-false' | 'short-answer';
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

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  description: string;
  questions: Question[];
  settings: QuizSettings;
  createdAt: string;
  updatedAt: string;
}

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

export interface QuizAnalytics {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionStats: {
    questionIndex: number;
    questionText: string;
    correctPercentage: number;
    totalAnswered: number;
  }[];
  recentAttempts: QuizAttempt[];
}

// Local storage fallback helpers
const localStorageAPI = {
  getQuizzes(userId: string): Quiz[] {
    const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
    return quizzes.filter((q: Quiz) => q.userId === userId);
  },
  
  saveQuizzes(quizzes: Quiz[]) {
    localStorage.setItem('quizify_quizzes', JSON.stringify(quizzes));
  },
  
  getQuestions(userId: string): Question[] {
    const questions = JSON.parse(localStorage.getItem('quizify_questions') || '[]');
    return questions.filter((q: any) => q.userId === userId);
  },
  
  saveQuestions(questions: any[]) {
    localStorage.setItem('quizify_questions', JSON.stringify(questions));
  },
  
  getAttempts(): QuizAttempt[] {
    return JSON.parse(localStorage.getItem('quizify_attempts') || '[]');
  },
  
  saveAttempts(attempts: QuizAttempt[]) {
    localStorage.setItem('quizify_attempts', JSON.stringify(attempts));
  },
};

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
    if (!hasSupabaseCredentials) {
      // Local storage fallback
      const session = JSON.parse(localStorage.getItem('quizify_session') || '{}');
      const quiz: Quiz = {
        id: `quiz_${Date.now()}`,
        userId: session.user?.id || '',
        title: quizData.title || '',
        description: quizData.description || '',
        questions: quizData.questions || [],
        settings: quizData.settings || {
          timeLimit: null,
          shuffleQuestions: false,
          shuffleAnswers: false,
          showResults: true,
          passingScore: 70,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
      quizzes.push(quiz);
      localStorageAPI.saveQuizzes(quizzes);
      
      return quiz;
    }

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
              // RPC doesn't exist yet, create quiz using raw SQL approach
              // This is a last resort workaround - we'll create an auto-setup RPC
              throw new Error(
                'Database setup incomplete. The schema cache needs to be reloaded. Please go to Supabase Dashboard → Settings → API → Click "Reload schema", then try again.'
              );
            }
            
            return dbRowToQuiz(rpcData);
          } catch (rpcErr: any) {
            // If RPC doesn't exist, provide clear instructions
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
    if (!hasSupabaseCredentials) {
      const session = JSON.parse(localStorage.getItem('quizify_session') || '{}');
      return localStorageAPI.getQuizzes(session.user?.id || '');
    }

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
    if (!hasSupabaseCredentials) {
      const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
      const quiz = quizzes.find((q: Quiz) => q.id === quizId);
      if (!quiz) throw new Error('Quiz not found');
      return quiz;
    }

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
    if (!hasSupabaseCredentials) {
      const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
      const quiz = quizzes.find((q: Quiz) => q.id === quizId);
      if (!quiz) throw new Error('Quiz not found');
      return quiz;
    }

    // Use RPC function for public access (with questions from separate table)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_quiz', {
        p_quiz_id: quizId
      });

      if (rpcError) {
        console.error('Failed to load public quiz:', rpcError);
        throw new Error('Quiz not found');
      }
      
      if (!rpcData) throw new Error('Quiz not found');
      return dbRowToQuiz(rpcData);
    } catch (err: any) {
      console.error('Error loading public quiz:', err);
      throw err;
    }
  },

  async updateQuiz(accessToken: string, quizId: string, updates: Partial<Quiz>): Promise<Quiz> {
    if (!hasSupabaseCredentials) {
      const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
      const index = quizzes.findIndex((q: Quiz) => q.id === quizId);
      if (index === -1) throw new Error('Quiz not found');
      
      quizzes[index] = {
        ...quizzes[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      localStorageAPI.saveQuizzes(quizzes);
      return quizzes[index];
    }

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
    if (!hasSupabaseCredentials) {
      const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
      const filtered = quizzes.filter((q: Quiz) => q.id !== quizId);
      localStorageAPI.saveQuizzes(filtered);
      return;
    }

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
  },

  // Question bank operations
  async saveQuestion(accessToken: string, question: Question): Promise<Question> {
    if (!hasSupabaseCredentials) {
      const session = JSON.parse(localStorage.getItem('quizify_session') || '{}');
      const questionWithId = {
        ...question,
        id: `question_${Date.now()}`,
        userId: session.user?.id || '',
      };
      
      const questions = JSON.parse(localStorage.getItem('quizify_questions') || '[]');
      questions.push(questionWithId);
      localStorageAPI.saveQuestions(questions);
      
      return questionWithId;
    }

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('questions')
      .insert({
        user_id: user.id,
        type: question.type,
        question: question.question,
        options: question.options,
        correct_answer: String(question.correctAnswer),
        points: question.points || 1,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      type: data.type,
      question: data.question,
      options: data.options,
      correctAnswer: data.correct_answer,
      points: data.points,
    };
  },

  async getQuestions(accessToken: string): Promise<Question[]> {
    if (!hasSupabaseCredentials) {
      const session = JSON.parse(localStorage.getItem('quizify_session') || '{}');
      return localStorageAPI.getQuestions(session.user?.id || '');
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
      type: row.type,
      question: row.question,
      options: row.options,
      correctAnswer: row.correct_answer,
      points: row.points,
    }));
  },

  async deleteQuestion(accessToken: string, questionId: string): Promise<void> {
    if (!hasSupabaseCredentials) {
      const questions = JSON.parse(localStorage.getItem('quizify_questions') || '[]');
      const filtered = questions.filter((q: any) => q.id !== questionId);
      localStorageAPI.saveQuestions(filtered);
      return;
    }

    const { error } = await supabase
      .from('questions')
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
    try {
      // Apply security middleware
      const securityCheck = await SecurityMiddleware.applySecurityChecks(
        'submitQuizAttempt',
        attemptData
      );
      
      if (!securityCheck.valid) {
        throw new Error(securityCheck.error);
      }

      // Get quiz for validation
      const quiz = await this.getQuiz(quizId);
      
      // Create quiz submission object for validation
      const submission: QuizSubmission = {
        quizId,
        userName: attemptData.userName,
        userEmail: attemptData.userEmail,
        answers: attemptData.answers,
        timeSpent: attemptData.timeSpent,
        quiz
      };

      // Validate submission
      const validation = QuizValidator.validateSubmission(submission);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
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
      sanitizedData.answers.forEach((answer, index) => {
        if (quiz.questions[index] && answer === quiz.questions[index].correctAnswer) {
          correctAnswers++;
        }
      });
      
      const score = Math.round((correctAnswers / quiz.questions.length) * 100);
      const passed = score >= quiz.settings.passingScore;

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

      if (!hasSupabaseCredentials) {
        // Local storage fallback
        const attempts = localStorageAPI.getAttempts();
        attempts.push(processedAttempt);
        localStorageAPI.saveAttempts(attempts);
        
        // Sync local attempts when connection is restored
        QuizErrorRecovery.syncLocalAttempts().catch(console.warn);
        
        return processedAttempt;
      }

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
    if (!hasSupabaseCredentials) {
      const attempts = localStorageAPI.getAttempts();
      return attempts.filter(a => a.quizId === quizId);
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(dbRowToAttempt);
  },

  async getQuizAnalytics(accessToken: string, quizId: string): Promise<QuizAnalytics> {
    if (!hasSupabaseCredentials) {
      const attempts = localStorageAPI.getAttempts().filter(a => a.quizId === quizId);
      const quizzes = JSON.parse(localStorage.getItem('quizify_quizzes') || '[]');
      const quiz = quizzes.find((q: Quiz) => q.id === quizId);
      
      if (!quiz) throw new Error('Quiz not found');
      
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
      
      // Calculate per-question stats (with safety check)
      const questionStats = (quiz.questions || []).map((q: Question, index: number) => {
        const answersForQuestion = attempts.map(a => a.answers[index]);
        const correctCount = answersForQuestion.filter(
          answer => answer === q.correctAnswer
        ).length;
        
        return {
          questionIndex: index,
          questionText: q.question,
          correctPercentage: totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0,
          totalAnswered: totalAttempts,
        };
      });
      
      return {
        totalAttempts,
        averageScore,
        passRate,
        averageTimeSpent,
        questionStats,
        recentAttempts: attempts.slice(-10).reverse(),
      };
    }

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
    
    // Calculate per-question stats (with safety check)
    const questionStats = (quiz.questions || []).map((q: Question, index: number) => {
      const answersForQuestion = attempts.map(a => a.answers[index]);
      const correctCount = answersForQuestion.filter(
        answer => answer === q.correctAnswer
      ).length;
      
      return {
        questionIndex: index,
        questionText: q.question,
        correctPercentage: totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0,
        totalAnswered: totalAttempts,
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
      
      // Calculate advanced analytics
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