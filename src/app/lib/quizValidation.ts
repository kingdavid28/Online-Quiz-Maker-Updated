import { Quiz, Question, ParsedQuestion } from './api';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface QuizSubmission {
  quizId: string;
  userName: string;
  userEmail: string;
  answers: (string | number | boolean | string[])[];
  timeSpent: number;
  quiz: Quiz;
}

/**
 * Comprehensive validation for quiz submissions
 */
export class QuizValidator {
  /**
   * Validate complete quiz submission
   */
  static validateSubmission(submission: QuizSubmission): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate basic submission data
    this.validateBasicData(submission, errors, warnings);
    
    // Validate user information
    this.validateUserInfo(submission, errors, warnings);
    
    // Validate answers against questions
    this.validateAnswers(submission, errors, warnings);
    
    // Validate timing
    this.validateTiming(submission, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate basic submission data
   */
  private static validateBasicData(
    submission: QuizSubmission,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!submission.quizId || typeof submission.quizId !== 'string') {
      errors.push({
        field: 'quizId',
        message: 'Quiz ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!submission.quiz || !submission.quiz.questions) {
      errors.push({
        field: 'quiz',
        message: 'Quiz data is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!Array.isArray(submission.answers)) {
      errors.push({
        field: 'answers',
        message: 'Answers must be an array',
        code: 'INVALID_TYPE'
      });
    }
  }

  /**
   * Validate user information
   */
  private static validateUserInfo(
    submission: QuizSubmission,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Validate user name
    if (!submission.userName || typeof submission.userName !== 'string') {
      errors.push({
        field: 'userName',
        message: 'User name is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (submission.userName.trim().length < 2) {
      errors.push({
        field: 'userName',
        message: 'User name must be at least 2 characters long',
        code: 'INVALID_LENGTH'
      });
    } else if (submission.userName.trim().length > 100) {
      errors.push({
        field: 'userName',
        message: 'User name must be less than 100 characters',
        code: 'INVALID_LENGTH'
      });
    }

    // Validate user email (optional but if provided, must be valid)
    if (submission.userEmail && typeof submission.userEmail === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(submission.userEmail)) {
        errors.push({
          field: 'userEmail',
          message: 'Invalid email format',
          code: 'INVALID_FORMAT'
        });
      }
    } else if (submission.userEmail) {
      errors.push({
        field: 'userEmail',
        message: 'User email must be a string',
        code: 'INVALID_TYPE'
      });
    }

    // Check for potentially sensitive information
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\bpassword\b/i, // Password field
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(submission.userName)) {
        warnings.push({
          field: 'userName',
          message: 'User name contains potentially sensitive information',
          code: 'SENSITIVE_DATA'
        });
        break;
      }
    }
  }

  /**
   * Validate answers against questions
   */
  private static validateAnswers(
    submission: QuizSubmission,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!submission.quiz || !Array.isArray(submission.quiz.questions)) {
      return;
    }

    const questions = submission.quiz.questions;
    const answers = submission.answers;

    // Check if number of answers matches number of questions
    if (answers.length !== questions.length) {
      errors.push({
        field: 'answers',
        message: `Number of answers (${answers.length}) must match number of questions (${questions.length})`,
        code: 'MISMATCH_COUNT'
      });
      return;
    }

    // Validate each answer
    questions.forEach((question, index) => {
      const answer = answers[index];
      const fieldPrefix = `answers[${index}]`;

      try {
        this.validateSingleAnswer(answer, question, fieldPrefix, errors, warnings);
      } catch (error) {
        errors.push({
          field: fieldPrefix,
          message: `Error validating answer for question ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_ERROR'
        });
      }
    });
  }

  /**
   * Validate a single answer against its question
   */
  private static validateSingleAnswer(
    answer: any,
    question: Question,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Check if answer is provided (unless question is optional)
    if (answer === null || answer === undefined) {
      if (question.required !== false) {
        errors.push({
          field: fieldPrefix,
          message: `Answer is required for question ${fieldPrefix}`,
          code: 'REQUIRED_ANSWER'
        });
      }
      return;
    }

    // Validate based on question type
    switch (question.type) {
      case 'multiple-choice':
        this.validateMultipleChoiceAnswer(answer, question, fieldPrefix, errors, warnings);
        break;
      case 'true-false':
        this.validateTrueFalseAnswer(answer, question, fieldPrefix, errors, warnings);
        break;
      case 'short-answer':
        this.validateShortAnswerAnswer(answer, question, fieldPrefix, errors, warnings);
        break;
      case 'fill-blank':
        this.validateFillBlankAnswer(answer, question, fieldPrefix, errors, warnings);
        break;
      case 'matching':
        this.validateMatchingAnswer(answer, question, fieldPrefix, errors, warnings);
        break;
      default:
        warnings.push({
          field: fieldPrefix,
          message: `Unknown question type: ${question.type}`,
          code: 'UNKNOWN_TYPE'
        });
    }
  }

  /**
   * Validate multiple choice answer
   */
  private static validateMultipleChoiceAnswer(
    answer: any,
    question: Question,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!question.options || !Array.isArray(question.options)) {
      errors.push({
        field: fieldPrefix,
        message: 'Multiple choice question must have options',
        code: 'MISSING_OPTIONS'
      });
      return;
    }

    // Handle both single and multiple answers
    if (Array.isArray(answer)) {
      // Multiple answers allowed
      if (answer.length === 0) {
        errors.push({
          field: fieldPrefix,
          message: 'At least one option must be selected',
          code: 'EMPTY_SELECTION'
        });
        return;
      }

      // Validate each selected option
      answer.forEach((selected, index) => {
        if (!question.options!.includes(selected)) {
          errors.push({
            field: `${fieldPrefix}[${index}]`,
            message: `Invalid option selected: ${selected}`,
            code: 'INVALID_OPTION'
          });
        }
      });
    } else {
      // Single answer
      if (!question.options.includes(answer)) {
        errors.push({
          field: fieldPrefix,
          message: `Invalid option selected: ${answer}`,
          code: 'INVALID_OPTION'
        });
      }
    }
  }

  /**
   * Validate true/false answer
   */
  private static validateTrueFalseAnswer(
    answer: any,
    question: Question,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (typeof answer !== 'boolean') {
      // Allow string representations
      if (typeof answer === 'string') {
        const lower = answer.toLowerCase().trim();
        if (lower === 'true' || lower === 'false') {
          warnings.push({
            field: fieldPrefix,
            message: 'True/false answer should be a boolean value',
            code: 'TYPE_CONVERSION'
          });
          return;
        }
      }
      
      errors.push({
        field: fieldPrefix,
        message: 'True/false answer must be a boolean value',
        code: 'INVALID_TYPE'
      });
    }
  }

  /**
   * Validate short answer
   */
  private static validateShortAnswerAnswer(
    answer: any,
    question: Question,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (typeof answer !== 'string') {
      errors.push({
        field: fieldPrefix,
        message: 'Short answer must be a string',
        code: 'INVALID_TYPE'
      });
      return;
    }

    const trimmed = answer.trim();
    
    if (trimmed.length === 0) {
      errors.push({
        field: fieldPrefix,
        message: 'Short answer cannot be empty',
        code: 'EMPTY_ANSWER'
      });
      return;
    }

    // Check length constraints
    if (question.maxLength && trimmed.length > question.maxLength) {
      errors.push({
        field: fieldPrefix,
        message: `Answer exceeds maximum length of ${question.maxLength} characters`,
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    if (question.minLength && trimmed.length < question.minLength) {
      errors.push({
        field: fieldPrefix,
        message: `Answer must be at least ${question.minLength} characters long`,
        code: 'MIN_LENGTH_NOT_MET'
      });
    }

    // Check for potentially inappropriate content
    const inappropriatePatterns = [
      /\b(password|secret|confidential)\b/i,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(trimmed)) {
        warnings.push({
          field: fieldPrefix,
          message: 'Answer contains potentially sensitive or inappropriate content',
          code: 'INAPPROPRIATE_CONTENT'
        });
        break;
      }
    }
  }

  /**
   * Validate fill in the blank answer
   */
  private static validateFillBlankAnswer(
    answer: any,
    question: Question,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (typeof answer !== 'string') {
      errors.push({
        field: fieldPrefix,
        message: 'Fill in the blank answer must be a string',
        code: 'INVALID_TYPE'
      });
      return;
    }

    const trimmed = answer.trim();
    
    if (trimmed.length === 0) {
      errors.push({
        field: fieldPrefix,
        message: 'Fill in the blank answer cannot be empty',
        code: 'EMPTY_ANSWER'
      });
    }
  }

  /**
   * Validate matching answer
   */
  private static validateMatchingAnswer(
    answer: any,
    question: Question,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!Array.isArray(answer)) {
      errors.push({
        field: fieldPrefix,
        message: 'Matching answer must be an array',
        code: 'INVALID_TYPE'
      });
      return;
    }

    // Validate each pair in the matching
    answer.forEach((pair, index) => {
      if (typeof pair !== 'object' || pair === null) {
        errors.push({
          field: `${fieldPrefix}[${index}]`,
          message: 'Each matching pair must be an object',
          code: 'INVALID_PAIR'
        });
        return;
      }

      if (!pair.left || !pair.right) {
        errors.push({
          field: `${fieldPrefix}[${index}]`,
          message: 'Each matching pair must have left and right values',
          code: 'INCOMPLETE_PAIR'
        });
      }
    });
  }

  /**
   * Validate timing information
   */
  private static validateTiming(
    submission: QuizSubmission,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (typeof submission.timeSpent !== 'number' || submission.timeSpent < 0) {
      errors.push({
        field: 'timeSpent',
        message: 'Time spent must be a non-negative number',
        code: 'INVALID_TIME'
      });
    }

    // Check for unusually fast completion (possible cheating)
    if (submission.quiz && submission.timeSpent > 0) {
      const minimumReasonableTime = submission.quiz.questions.length * 5; // 5 seconds per question minimum
      if (submission.timeSpent < minimumReasonableTime) {
        warnings.push({
          field: 'timeSpent',
          message: 'Quiz completed unusually quickly',
          code: 'UNUSUAL_SPEED'
        });
      }
    }

    // Check for unusually slow completion (possible abandonment)
    if (submission.quiz && submission.timeSpent > 0) {
      const maximumReasonableTime = submission.quiz.questions.length * 300; // 5 minutes per question maximum
      if (submission.timeSpent > maximumReasonableTime) {
        warnings.push({
          field: 'timeSpent',
          message: 'Quiz took unusually long to complete',
          code: 'EXCESSIVE_TIME'
        });
      }
    }
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  /**
   * Generate anonymous user ID for privacy
   */
  static generateAnonymousId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Error classification for better error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Classify error type for appropriate handling
 */
export function classifyError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN_ERROR;

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
    return ErrorType.NETWORK_ERROR;
  }

  // Permission errors
  if (error.code === '42501' || error.message?.includes('permission')) {
    return ErrorType.PERMISSION_ERROR;
  }

  // Server errors
  if (error.code >= 500 || error.status >= 500) {
    return ErrorType.SERVER_ERROR;
  }

  // Timeout errors
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return ErrorType.TIMEOUT_ERROR;
  }

  // Validation errors
  if (error.code?.startsWith('23') || error.message?.includes('constraint')) {
    return ErrorType.VALIDATION_ERROR;
  }

  return ErrorType.UNKNOWN_ERROR;
}
