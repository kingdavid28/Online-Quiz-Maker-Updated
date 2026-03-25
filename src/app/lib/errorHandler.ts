import { ErrorType, classifyError } from './quizValidation';
import { QuizAttempt, Quiz } from './api';

export interface ErrorReport {
  id: string;
  type: ErrorType;
  message: string;
  code?: string;
  timestamp: string;
  context: string;
  userId?: string;
  quizId?: string;
  stack?: string;
  userAgent: string;
  url: string;
  resolved: boolean;
}

export interface RecoveryAction {
  type: 'RETRY' | 'FALLBACK' | 'USER_ACTION' | 'IGNORE';
  description: string;
  action: () => Promise<void> | void;
  canRetry: boolean;
  maxRetries?: number;
}

export interface ErrorContext {
  operation: string;
  data?: any;
  userId?: string;
  quizId?: string;
  attemptId?: string;
}

/**
 * Enhanced Error Handler with classification and recovery
 */
export class ErrorHandler {
  private static errorReports: ErrorReport[] = [];
  private static maxStoredErrors = 100;

  /**
   * Handle error with classification and recovery
   */
  static async handleError(
    error: any,
    context: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ): Promise<void> {
    const errorType = classifyError(error);
    const errorReport = this.createErrorReport(error, errorType, context);
    
    // Store error report
    this.storeErrorReport(errorReport);
    
    // Log error for debugging
    this.logError(errorReport);
    
    // Attempt recovery
    if (recoveryActions && recoveryActions.length > 0) {
      await this.attemptRecovery(errorType, recoveryActions, errorReport);
    }
    
    // Show appropriate user feedback
    this.showUserFeedback(errorType, error, context);
  }

  /**
   * Create standardized error report
   */
  private static createErrorReport(
    error: any,
    type: ErrorType,
    context: ErrorContext
  ): ErrorReport {
    return {
      id: this.generateErrorId(),
      type,
      message: error.message || 'Unknown error occurred',
      code: error.code,
      timestamp: new Date().toISOString(),
      context: context.operation,
      userId: context.userId,
      quizId: context.quizId,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      resolved: false
    };
  }

  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store error report locally
   */
  private static storeErrorReport(report: ErrorReport): void {
    this.errorReports.unshift(report);
    
    // Keep only the most recent errors
    if (this.errorReports.length > this.maxStoredErrors) {
      this.errorReports = this.errorReports.slice(0, this.maxStoredErrors);
    }
    
    // Also store in localStorage for persistence
    try {
      const stored = localStorage.getItem('quizify_error_reports');
      const reports = stored ? JSON.parse(stored) : [];
      reports.unshift(report);
      
      // Keep only recent errors in localStorage
      const recentReports = reports.slice(0, 50);
      localStorage.setItem('quizify_error_reports', JSON.stringify(recentReports));
    } catch (error) {
      console.warn('Failed to store error report in localStorage:', error);
    }
  }

  /**
   * Log error for debugging
   */
  private static logError(report: ErrorReport): void {
    const logMessage = `[${report.type}] ${report.message} in ${report.context}`;
    
    switch (report.type) {
      case ErrorType.VALIDATION_ERROR:
        console.warn(logMessage, report);
        break;
      case ErrorType.NETWORK_ERROR:
        console.error(logMessage, report);
        break;
      case ErrorType.PERMISSION_ERROR:
        console.error(logMessage, report);
        break;
      case ErrorType.SERVER_ERROR:
        console.error(logMessage, report);
        break;
      default:
        console.error(logMessage, report);
    }
  }

  /**
   * Attempt error recovery based on type and available actions
   */
  private static async attemptRecovery(
    errorType: ErrorType,
    recoveryActions: RecoveryAction[],
    errorReport: ErrorReport
  ): Promise<void> {
    for (const action of recoveryActions) {
      try {
        if (this.shouldAttemptAction(action, errorType)) {
          console.log(`Attempting recovery action: ${action.description}`);
          await action.action();
          
          // Mark error as resolved if action succeeded
          errorReport.resolved = true;
          this.updateErrorReport(errorReport);
          break;
        }
      } catch (recoveryError) {
        console.warn(`Recovery action failed: ${action.description}`, recoveryError);
      }
    }
  }

  /**
   * Determine if recovery action should be attempted
   */
  private static shouldAttemptAction(action: RecoveryAction, errorType: ErrorType): boolean {
    switch (errorType) {
      case ErrorType.NETWORK_ERROR:
        return action.type === 'RETRY' || action.type === 'FALLBACK';
      case ErrorType.SERVER_ERROR:
        return action.type === 'FALLBACK' || action.type === 'USER_ACTION';
      case ErrorType.PERMISSION_ERROR:
        return action.type === 'USER_ACTION';
      case ErrorType.TIMEOUT_ERROR:
        return action.type === 'RETRY';
      default:
        return action.type === 'FALLBACK' || action.type === 'USER_ACTION';
    }
  }

  /**
   * Update error report
   */
  private static updateErrorReport(report: ErrorReport): void {
    const index = this.errorReports.findIndex(r => r.id === report.id);
    if (index !== -1) {
      this.errorReports[index] = report;
    }
  }

  /**
   * Show appropriate user feedback
   */
  private static showUserFeedback(errorType: ErrorType, error: any, context: ErrorContext): void {
    // Import toast dynamically to avoid circular dependencies
    const { toast } = require('sonner');
    
    switch (errorType) {
      case ErrorType.VALIDATION_ERROR:
        toast.error('Invalid data provided. Please check your input and try again.');
        break;
      case ErrorType.NETWORK_ERROR:
        toast.error('Network connection issue. Attempting to recover...');
        break;
      case ErrorType.PERMISSION_ERROR:
        toast.error('Permission denied. Please check your access rights.');
        break;
      case ErrorType.SERVER_ERROR:
        toast.error('Server error occurred. Please try again later.');
        break;
      case ErrorType.TIMEOUT_ERROR:
        toast.error('Request timed out. Please try again.');
        break;
      default:
        toast.error('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Get stored error reports
   */
  static getErrorReports(): ErrorReport[] {
    return [...this.errorReports];
  }

  /**
   * Get error reports by type
   */
  static getErrorReportsByType(type: ErrorType): ErrorReport[] {
    return this.errorReports.filter(report => report.type === type);
  }

  /**
   * Get error statistics
   */
  static getErrorStatistics(): {
    total: number;
    byType: Record<ErrorType, number>;
    resolved: number;
    unresolved: number;
    recent: ErrorReport[];
  } {
    const byType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<ErrorType, number>);

    let resolved = 0;
    let unresolved = 0;

    this.errorReports.forEach(report => {
      byType[report.type]++;
      if (report.resolved) {
        resolved++;
      } else {
        unresolved++;
      }
    });

    return {
      total: this.errorReports.length,
      byType,
      resolved,
      unresolved,
      recent: this.errorReports.slice(0, 10)
    };
  }

  /**
   * Clear error reports
   */
  static clearErrorReports(): void {
    this.errorReports = [];
    try {
      localStorage.removeItem('quizify_error_reports');
    } catch (error) {
      console.warn('Failed to clear error reports from localStorage:', error);
    }
  }

  /**
   * Export error reports for debugging
   */
  static exportErrorReports(): string {
    const data = {
      exportDate: new Date().toISOString(),
      statistics: this.getErrorStatistics(),
      reports: this.errorReports
    };
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Quiz-specific error recovery actions
 */
export class QuizErrorRecovery {
  /**
   * Create recovery actions for quiz submission
   */
  static createQuizSubmissionRecoveryActions(
    quizId: string,
    attemptData: any,
    onSuccess: (attempt: QuizAttempt) => void,
    onFailure: (error: any) => void
  ): RecoveryAction[] {
    return [
      {
        type: 'RETRY',
        description: 'Retry quiz submission',
        action: async () => {
          const { api } = require('./api');
          const attempt = await api.submitQuizAttempt(quizId, attemptData);
          onSuccess(attempt);
        },
        canRetry: true,
        maxRetries: 3
      },
      {
        type: 'FALLBACK',
        description: 'Save quiz attempt locally',
        action: () => {
          this.saveAttemptLocally(quizId, attemptData);
          onSuccess(this.createLocalAttempt(quizId, attemptData));
        },
        canRetry: false
      },
      {
        type: 'USER_ACTION',
        description: 'Please check your internet connection',
        action: () => {
          // Show connection check UI
          this.showConnectionCheck();
        },
        canRetry: false
      }
    ];
  }

  /**
   * Create recovery actions for quiz loading
   */
  static createQuizLoadingRecoveryActions(
    quizId: string,
    onSuccess: (quiz: Quiz) => void,
    onFailure: (error: any) => void
  ): RecoveryAction[] {
    return [
      {
        type: 'RETRY',
        description: 'Retry loading quiz',
        action: async () => {
          const { api } = require('./api');
          const quiz = await api.getQuiz(quizId);
          onSuccess(quiz);
        },
        canRetry: true,
        maxRetries: 2
      },
      {
        type: 'FALLBACK',
        description: 'Load quiz from cache',
        action: () => {
          const cachedQuiz = this.loadQuizFromCache(quizId);
          if (cachedQuiz) {
            onSuccess(cachedQuiz);
          } else {
            throw new Error('No cached quiz available');
          }
        },
        canRetry: false
      },
      {
        type: 'USER_ACTION',
        description: 'Quiz not available. Please contact support.',
        action: () => {
          const { toast } = require('sonner');
          toast.error('Quiz not available. Please contact support.');
        },
        canRetry: false
      }
    ];
  }

  /**
   * Save quiz attempt locally
   */
  private static saveAttemptLocally(quizId: string, attemptData: any): void {
    try {
      const attempts = JSON.parse(localStorage.getItem('quizify_local_attempts') || '[]');
      const localAttempt = {
        id: `local_${Date.now()}`,
        quizId,
        ...attemptData,
        timestamp: new Date().toISOString(),
        synced: false
      };
      attempts.push(localAttempt);
      localStorage.setItem('quizify_local_attempts', JSON.stringify(attempts));
    } catch (error) {
      console.error('Failed to save attempt locally:', error);
    }
  }

  /**
   * Create local attempt object
   */
  private static createLocalAttempt(quizId: string, attemptData: any): QuizAttempt {
    return {
      id: `local_${Date.now()}`,
      quizId,
      userName: attemptData.userName,
      userEmail: attemptData.userEmail,
      answers: attemptData.answers,
      score: 0, // Will be calculated when synced
      correctAnswers: 0,
      totalQuestions: 0,
      passed: false,
      timeSpent: attemptData.timeSpent,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Load quiz from cache
   */
  private static loadQuizFromCache(quizId: string): Quiz | null {
    try {
      const cached = localStorage.getItem(`quizify_quiz_cache_${quizId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to load quiz from cache:', error);
      return null;
    }
  }

  /**
   * Show connection check UI
   */
  private static showConnectionCheck(): void {
    // This would typically show a modal or notification
    const { toast } = require('sonner');
    toast.info('Checking your internet connection...', {
      duration: 5000,
      action: {
        label: 'Test Connection',
        onClick: () => this.testConnection()
      }
    });
  }

  /**
   * Test network connection
   */
  private static async testConnection(): Promise<void> {
    try {
      const response = await fetch('https://httpbin.org/get', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      const { toast } = require('sonner');
      toast.success('Connection restored!');
    } catch (error) {
      const { toast } = require('sonner');
      toast.error('Connection still unavailable. Please check your network.');
    }
  }

  /**
   * Sync local attempts when connection is restored
   */
  static async syncLocalAttempts(): Promise<void> {
    try {
      const attempts = JSON.parse(localStorage.getItem('quizify_local_attempts') || '[]');
      const unsyncedAttempts = attempts.filter((attempt: any) => !attempt.synced);
      
      if (unsyncedAttempts.length === 0) {
        return;
      }

      const { api } = require('./api');
      
      for (const attempt of unsyncedAttempts) {
        try {
          await api.submitQuizAttempt(attempt.quizId, {
            userName: attempt.userName,
            userEmail: attempt.userEmail,
            answers: attempt.answers,
            timeSpent: attempt.timeSpent
          });
          
          // Mark as synced
          attempt.synced = true;
        } catch (error) {
          console.warn(`Failed to sync attempt ${attempt.id}:`, error);
        }
      }

      // Update local storage
      localStorage.setItem('quizify_local_attempts', JSON.stringify(attempts));
      
      const { toast } = require('sonner');
      toast.success(`Synced ${unsyncedAttempts.length} quiz attempts`);
    } catch (error) {
      console.error('Failed to sync local attempts:', error);
    }
  }
}

/**
 * Global error boundary for React components
 */
export class ErrorBoundary {
  private static hasSetup = false;

  /**
   * Setup global error handlers
   */
  static setup(): void {
    if (this.hasSetup) return;

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      ErrorHandler.handleError(event.reason, {
        operation: 'unhandled_promise_rejection'
      });
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      ErrorHandler.handleError(event.error, {
        operation: 'uncaught_error',
        data: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    this.hasSetup = true;
  }
}
