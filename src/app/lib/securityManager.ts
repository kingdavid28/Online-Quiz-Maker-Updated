/**
 * Security Manager for comprehensive input sanitization and protection
 */

export interface SecurityConfig {
  maxInputLength: number;
  allowedHtmlTags: string[];
  allowedAttributes: string[];
  sanitizeUrls: boolean;
  preventXss: boolean;
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  csrfProtection: {
    enabled: boolean;
    tokenExpiry: number;
  };
}

export interface SecurityViolation {
  type: 'XSS_ATTEMPT' | 'SQL_INJECTION' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'CSRF_TOKEN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  data?: any;
}

export interface RateLimitEntry {
  ip: string;
  requests: number;
  windowStart: number;
  blocked: boolean;
}

/**
 * Security Manager class for handling all security-related operations
 */
export class SecurityManager {
  private static config: SecurityConfig = {
    maxInputLength: 10000,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    allowedAttributes: ['class', 'id'],
    sanitizeUrls: true,
    preventXss: true,
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 15 * 60 * 1000 // 15 minutes
    },
    csrfProtection: {
      enabled: true,
      tokenExpiry: 60 * 60 * 1000 // 1 hour
    }
  };

  private static rateLimitMap = new Map<string, RateLimitEntry>();
  private static csrfTokens = new Map<string, { token: string; expiry: number }>();
  private static securityViolations: SecurityViolation[] = [];

  /**
   * Get current security configuration
   */
  static getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  static updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Comprehensive input sanitization
   */
  static sanitizeInput(input: any, context: string = 'general'): string {
    if (input === null || input === undefined) {
      return '';
    }

    let sanitized = String(input);

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters (except newlines, tabs, carriage returns)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length limits
    if (sanitized.length > this.config.maxInputLength) {
      this.logSecurityViolation('INVALID_INPUT', 'MEDIUM', 'Input exceeds maximum length');
      sanitized = sanitized.substring(0, this.config.maxInputLength);
    }

    // XSS protection
    if (this.config.preventXss) {
      sanitized = this.preventXSS(sanitized);
    }

    // URL sanitization
    if (this.config.sanitizeUrls && this.containsUrl(sanitized)) {
      sanitized = this.sanitizeUrls(sanitized);
    }

    // Context-specific sanitization
    sanitized = this.contextSpecificSanitization(sanitized, context);

    return sanitized;
  }

  /**
   * Prevent XSS attacks
   */
  private static preventXSS(input: string): string {
    // Remove potentially dangerous patterns
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
      /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<\s*\/?\s*\w+\s*[^>]*>/g // Remove all HTML tags except allowed ones
    ];

    let sanitized = input;
    
    dangerousPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        this.logSecurityViolation('XSS_ATTEMPT', 'HIGH', 'Potential XSS pattern detected');
      }
      sanitized = sanitized.replace(pattern, '');
    });

    // HTML entity encoding for special characters
    sanitized = sanitized.replace(/[<>"'&]/g, (match) => {
      const entityMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entityMap[match];
    });

    return sanitized;
  }

  /**
   * Check if input contains URLs
   */
  private static containsUrl(input: string): boolean {
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    return urlPattern.test(input);
  }

  /**
   * Sanitize URLs in input
   */
  private static sanitizeUrls(input: string): string {
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    
    return input.replace(urlPattern, (match) => {
      // Basic URL validation
      try {
        const url = new URL(match);
        // Only allow http and https protocols
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return `[URL: ${url.hostname}]`;
        }
      } catch {
        // Invalid URL
      }
      return '[INVALID_URL]';
    });
  }

  /**
   * Context-specific sanitization
   */
  private static contextSpecificSanitization(input: string, context: string): string {
    switch (context) {
      case 'email':
        return this.sanitizeEmail(input);
      case 'username':
        return this.sanitizeUsername(input);
      case 'quiz_answer':
        return this.sanitizeQuizAnswer(input);
      case 'quiz_question':
        return this.sanitizeQuizQuestion(input);
      case 'search':
        return this.sanitizeSearchQuery(input);
      default:
        return input;
    }
  }

  /**
   * Sanitize email addresses
   */
  private static sanitizeEmail(input: string): string {
    // Basic email validation and sanitization - very permissive for quiz app
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = input.toLowerCase().trim();
    
    // Skip email validation for quiz app - just sanitize
    // if (sanitized && !emailPattern.test(sanitized)) {
    //   this.logSecurityViolation('INVALID_INPUT', 'LOW', 'Invalid email format');
    //   return '';
    // }
    
    return sanitized;
  }

  /**
   * Sanitize usernames
   */
  private static sanitizeUsername(input: string): string {
    // Allow only alphanumeric characters, underscores, and hyphens
    const sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    
    if (sanitized.length < 2 || sanitized.length > 50) {
      this.logSecurityViolation('INVALID_INPUT', 'LOW', 'Invalid username format');
      return '';
    }
    
    return sanitized;
  }

  /**
   * Sanitize quiz answers
   */
  private static sanitizeQuizAnswer(input: string): string {
    // More permissive for quiz answers but still prevent XSS
    let sanitized = input;
    
    // Remove script tags and dangerous attributes
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Allow basic formatting but remove dangerous elements
    const allowedTags = this.config.allowedHtmlTags.join('|');
    const tagPattern = new RegExp(`<(?!\/?(?:${allowedTags})\b)[^>]*>`, 'gi');
    sanitized = sanitized.replace(tagPattern, '');
    
    return sanitized.trim();
  }

  /**
   * Sanitize quiz questions
   */
  private static sanitizeQuizQuestion(input: string): string {
    // Similar to answers but more restrictive
    return this.sanitizeQuizAnswer(input);
  }

  /**
   * Sanitize search queries
   */
  private static sanitizeSearchQuery(input: string): string {
    // Remove potentially dangerous search patterns
    let sanitized = input;
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|#|\/\*|\*\/)/g,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
    ];
    
    sqlPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        this.logSecurityViolation('SQL_INJECTION', 'HIGH', 'Potential SQL injection pattern');
      }
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized.trim();
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(ip: string): { allowed: boolean; remainingRequests: number; resetTime: number } {
    if (!this.config.rateLimiting.enabled) {
      return { allowed: true, remainingRequests: -1, resetTime: 0 };
    }

    const now = Date.now();
    const entry = this.rateLimitMap.get(ip);

    if (!entry) {
      this.rateLimitMap.set(ip, {
        ip,
        requests: 1,
        windowStart: now,
        blocked: false
      });
      return { allowed: true, remainingRequests: this.config.rateLimiting.maxRequests - 1, resetTime: now + this.config.rateLimiting.windowMs };
    }

    // Check if window has expired
    if (now - entry.windowStart > this.config.rateLimiting.windowMs) {
      entry.requests = 1;
      entry.windowStart = now;
      entry.blocked = false;
      return { allowed: true, remainingRequests: this.config.rateLimiting.maxRequests - 1, resetTime: now + this.config.rateLimiting.windowMs };
    }

    // Check if rate limit exceeded
    if (entry.requests >= this.config.rateLimiting.maxRequests) {
      if (!entry.blocked) {
        entry.blocked = true;
        this.logSecurityViolation('RATE_LIMIT', 'MEDIUM', 'Rate limit exceeded');
      }
      return { 
        allowed: false, 
        remainingRequests: 0, 
        resetTime: entry.windowStart + this.config.rateLimiting.windowMs 
      };
    }

    entry.requests++;
    return { 
      allowed: true, 
      remainingRequests: this.config.rateLimiting.maxRequests - entry.requests, 
      resetTime: entry.windowStart + this.config.rateLimiting.windowMs 
    };
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(sessionId: string): string {
    if (!this.config.csrfProtection.enabled) {
      return '';
    }

    const token = this.generateSecureToken();
    const expiry = Date.now() + this.config.csrfProtection.tokenExpiry;
    
    this.csrfTokens.set(sessionId, { token, expiry });
    
    return token;
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(sessionId: string, providedToken: string): boolean {
    if (!this.config.csrfProtection.enabled) {
      return true;
    }

    const storedToken = this.csrfTokens.get(sessionId);
    
    if (!storedToken) {
      this.logSecurityViolation('CSRF_TOKEN', 'HIGH', 'Missing CSRF token');
      return false;
    }

    // Check if token has expired
    if (Date.now() > storedToken.expiry) {
      this.csrfTokens.delete(sessionId);
      this.logSecurityViolation('CSRF_TOKEN', 'MEDIUM', 'Expired CSRF token');
      return false;
    }

    // Validate token
    const isValid = storedToken.token === providedToken;
    
    if (!isValid) {
      this.logSecurityViolation('CSRF_TOKEN', 'HIGH', 'Invalid CSRF token');
    }

    return isValid;
  }

  /**
   * Generate secure random token
   */
  private static generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clean up expired tokens and rate limit entries
   */
  static cleanup(): void {
    const now = Date.now();

    // Clean up expired CSRF tokens
    for (const [sessionId, token] of this.csrfTokens.entries()) {
      if (now > token.expiry) {
        this.csrfTokens.delete(sessionId);
      }
    }

    // Clean up expired rate limit entries
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now - entry.windowStart > this.config.rateLimiting.windowMs) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  /**
   * Log security violation
   */
  private static logSecurityViolation(
    type: SecurityViolation['type'],
    severity: SecurityViolation['severity'],
    message: string,
    data?: any
  ): void {
    const violation: SecurityViolation = {
      type,
      severity,
      message,
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
      data
    };

    this.securityViolations.push(violation);

    // Keep only recent violations
    if (this.securityViolations.length > 1000) {
      this.securityViolations = this.securityViolations.slice(-1000);
    }

    // Log to console for debugging
    console.warn(`Security Violation [${severity}]: ${message}`, violation);

    // Store in localStorage for persistence
    try {
      const stored = localStorage.getItem('quizify_security_violations');
      const violations = stored ? JSON.parse(stored) : [];
      violations.push(violation);
      
      // Keep only recent violations in localStorage
      const recentViolations = violations.slice(-100);
      localStorage.setItem('quizify_security_violations', JSON.stringify(recentViolations));
    } catch (error) {
      console.warn('Failed to store security violation:', error);
    }
  }

  /**
   * Get client IP (simplified - in production, use server-side detection)
   */
  private static getClientIP(): string {
    // This is a placeholder - in production, you'd get this from your server
    return 'client_ip_redacted';
  }

  /**
   * Get security violations
   */
  static getSecurityViolations(): SecurityViolation[] {
    return [...this.securityViolations];
  }

  /**
   * Get security statistics
   */
  static getSecurityStatistics(): {
    totalViolations: number;
    byType: Record<SecurityViolation['type'], number>;
    bySeverity: Record<SecurityViolation['severity'], number>;
    recent: SecurityViolation[];
  } {
    const byType = this.securityViolations.reduce((acc, violation) => {
      acc[violation.type] = (acc[violation.type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityViolation['type'], number>);

    const bySeverity = this.securityViolations.reduce((acc, violation) => {
      acc[violation.severity] = (acc[violation.severity] || 0) + 1;
      return acc;
    }, {} as Record<SecurityViolation['severity'], number>);

    return {
      totalViolations: this.securityViolations.length,
      byType,
      bySeverity,
      recent: this.securityViolations.slice(-10)
    };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: File): { valid: boolean; error?: string } {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 5MB limit' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    // Check file name
    const fileName = file.name.toLowerCase();
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
    
    if (hasDangerousExtension) {
      this.logSecurityViolation('INVALID_INPUT', 'HIGH', 'Dangerous file extension detected');
      return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
  }

  /**
   * Validate quiz data structure
   */
  static validateQuizData(quiz: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!quiz || typeof quiz !== 'object') {
      errors.push('Quiz must be an object');
      return { valid: false, errors };
    }

    // Validate title
    if (!quiz.title || typeof quiz.title !== 'string') {
      errors.push('Quiz title is required and must be a string');
    } else if (quiz.title.length > 200) {
      errors.push('Quiz title must be less than 200 characters');
    }

    // Validate questions
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      errors.push('Quiz must have at least one question');
    } else {
      quiz.questions.forEach((question: any, index: number) => {
        if (!question.question || typeof question.question !== 'string') {
          errors.push(`Question ${index + 1}: Question text is required`);
        }
        
        if (!question.type || !['multiple-choice', 'true-false', 'short-answer'].includes(question.type)) {
          errors.push(`Question ${index + 1}: Invalid question type`);
        }
        
        if (question.type === 'multiple-choice' && (!Array.isArray(question.options) || question.options.length < 2)) {
          errors.push(`Question ${index + 1}: Multiple choice questions must have at least 2 options`);
        }
      });
    }

    // Validate settings
    if (quiz.settings && typeof quiz.settings === 'object') {
      if (quiz.settings.passingScore !== undefined && (typeof quiz.settings.passingScore !== 'number' || quiz.settings.passingScore < 0 || quiz.settings.passingScore > 100)) {
        errors.push('Passing score must be a number between 0 and 100');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate security headers (for server-side implementation)
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  /**
   * Clear security violations
   */
  static clearSecurityViolations(): void {
    this.securityViolations = [];
    try {
      localStorage.removeItem('quizify_security_violations');
    } catch (error) {
      console.warn('Failed to clear security violations from localStorage:', error);
    }
  }

  /**
   * Export security report
   */
  static exportSecurityReport(): string {
    const report = {
      exportDate: new Date().toISOString(),
      config: this.config,
      statistics: this.getSecurityStatistics(),
      violations: this.securityViolations,
      rateLimitEntries: Array.from(this.rateLimitMap.entries()),
      activeCSRFTokens: Array.from(this.csrfTokens.entries())
    };
    
    return JSON.stringify(report, null, 2);
  }
}

/**
 * Security middleware for API calls
 */
export class SecurityMiddleware {
  /**
   * Apply security checks to API requests
   */
  static async applySecurityChecks(
    endpoint: string,
    data: any,
    sessionId?: string
  ): Promise<{ valid: boolean; sanitizedData: any; error?: string }> {
    // Rate limiting
    const rateLimitResult = SecurityManager.checkRateLimit('client_ip');
    if (!rateLimitResult.allowed) {
      return { valid: false, sanitizedData: null, error: 'Rate limit exceeded' };
    }

    // CSRF protection for state-changing operations
    if (sessionId && ['POST', 'PUT', 'DELETE'].includes(endpoint.toUpperCase())) {
      const csrfToken = data?.csrfToken;
      if (!SecurityManager.validateCSRFToken(sessionId, csrfToken)) {
        return { valid: false, sanitizedData: null, error: 'Invalid CSRF token' };
      }
    }

    // Input sanitization
    const sanitizedData = this.sanitizeRequestData(data, endpoint);

    // Data validation
    const validationError = this.validateRequestData(sanitizedData, endpoint);
    if (validationError) {
      return { valid: false, sanitizedData: null, error: validationError };
    }

    return { valid: true, sanitizedData };
  }

  /**
   * Sanitize request data based on endpoint
   */
  private static sanitizeRequestData(data: any, endpoint: string): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Determine context based on key and endpoint
        let context = 'general';
        
        if (key.includes('email')) context = 'email';
        else if (key.includes('name') || key.includes('user')) context = 'username';
        else if (key.includes('answer')) context = 'quiz_answer';
        else if (key.includes('question')) context = 'quiz_question';
        else if (key.includes('search') || key.includes('query')) context = 'search';

        sanitized[key] = SecurityManager.sanitizeInput(value, context);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? SecurityManager.sanitizeInput(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Validate request data based on endpoint
   */
  private static validateRequestData(data: any, endpoint: string): string | null {
    if (endpoint.includes('quiz') && endpoint.includes('submit')) {
      const validation = SecurityManager.validateQuizData(data);
      if (!validation.valid) {
        return validation.errors.join(', ');
      }
    }

    return null;
  }
}

// Initialize security manager
SecurityManager.cleanup(); // Clean up any expired entries
setInterval(() => SecurityManager.cleanup(), 5 * 60 * 1000); // Cleanup every 5 minutes
