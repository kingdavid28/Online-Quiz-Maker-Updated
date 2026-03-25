import { QuizAttempt } from './api';

export interface PrivacySettings {
  allowAnalytics: boolean;
  allowPersonalInfo: boolean;
  allowDataSharing: boolean;
  retentionDays: number;
  allowPerformanceTracking: boolean;
  allowComparativeAnalysis: boolean;
}

export interface UserConsent {
  quizId: string;
  userName: string;
  consent: PrivacySettings;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PrivacyPolicy {
  version: string;
  effectiveDate: string;
  dataCollection: {
    required: string[];
    optional: string[];
    purposes: string[];
  };
  retention: {
    defaultDays: number;
    userControlled: boolean;
  };
  sharing: {
    thirdParty: boolean;
    anonymization: boolean;
    userControl: boolean;
  };
}

/**
 * Privacy Manager for handling user data according to best practices
 */
export class PrivacyManager {
  private static readonly DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    allowAnalytics: true,
    allowPersonalInfo: false,
    allowDataSharing: false,
    retentionDays: 365,
    allowPerformanceTracking: true,
    allowComparativeAnalysis: false
  };

  private static readonly PRIVACY_POLICY: PrivacyPolicy = {
    version: '1.0',
    effectiveDate: '2025-03-25',
    dataCollection: {
      required: ['Quiz ID', 'Answers', 'Score', 'Time spent'],
      optional: ['User name', 'User email', 'Performance analytics'],
      purposes: [
        'Quiz scoring and results',
        'Performance improvement',
        'Analytics and insights',
        'User experience optimization'
      ]
    },
    retention: {
      defaultDays: 365,
      userControlled: true
    },
    sharing: {
      thirdParty: false,
      anonymization: true,
      userControl: true
    }
  };

  /**
   * Get current privacy policy
   */
  static getPrivacyPolicy(): PrivacyPolicy {
    return this.PRIVACY_POLICY;
  }

  /**
   * Get default privacy settings
   */
  static getDefaultPrivacySettings(): PrivacySettings {
    return { ...this.DEFAULT_PRIVACY_SETTINGS };
  }

  /**
   * Load privacy settings from localStorage
   */
  static loadPrivacySettings(): PrivacySettings {
    try {
      const stored = localStorage.getItem('quizify_privacy_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.DEFAULT_PRIVACY_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load privacy settings:', error);
    }
    return this.getDefaultPrivacySettings();
  }

  /**
   * Save privacy settings to localStorage
   */
  static savePrivacySettings(settings: PrivacySettings): void {
    try {
      localStorage.setItem('quizify_privacy_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  /**
   * Apply privacy settings to quiz attempt
   */
  static applyPrivacySettings(attempt: QuizAttempt, settings: PrivacySettings): QuizAttempt {
    const processedAttempt = { ...attempt };

    // Remove personal info if not consented
    if (!settings.allowPersonalInfo) {
      processedAttempt.userName = this.generateAnonymousId();
      processedAttempt.userEmail = '';
    }

    // Sanitize all string fields
    processedAttempt.userName = this.sanitizePersonalInfo(processedAttempt.userName);
    processedAttempt.userEmail = this.sanitizePersonalInfo(processedAttempt.userEmail);

    // Add privacy metadata
    (processedAttempt as any).privacySettings = {
      analytics: settings.allowAnalytics,
      personalInfo: settings.allowPersonalInfo,
      dataSharing: settings.allowDataSharing,
      retentionDays: settings.retentionDays,
      timestamp: new Date().toISOString()
    };

    return processedAttempt;
  }

  /**
   * Generate anonymous user ID
   */
  static generateAnonymousId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize personal information
   */
  static sanitizePersonalInfo(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, 'XXX-XXX-XXXX') // Mask phone numbers
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, 'XXXX-XXXX-XXXX-XXXX') // Mask credit cards
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, 'XXX-XX-XXXX') // Mask SSN
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'email@example.com') // Mask emails
      .substring(0, 100); // Limit length
  }

  /**
   * Check if user consent is required
   */
  static isConsentRequired(quizId: string): boolean {
    const consentKey = `quizify_consent_${quizId}`;
    const consent = localStorage.getItem(consentKey);
    
    if (!consent) {
      return true;
    }

    try {
      const parsed = JSON.parse(consent);
      const consentDate = new Date(parsed.timestamp);
      const daysSinceConsent = (Date.now() - consentDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Require consent renewal every 6 months
      return daysSinceConsent > 180;
    } catch (error) {
      return true;
    }
  }

  /**
   * Save user consent
   */
  static saveUserConsent(quizId: string, userName: string, settings: PrivacySettings): void {
    const consent: UserConsent = {
      quizId,
      userName: this.sanitizePersonalInfo(userName),
      consent: settings,
      timestamp: new Date().toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    const consentKey = `quizify_consent_${quizId}`;
    try {
      localStorage.setItem(consentKey, JSON.stringify(consent));
    } catch (error) {
      console.error('Failed to save user consent:', error);
    }
  }

  /**
   * Get user consent for a quiz
   */
  static getUserConsent(quizId: string): UserConsent | null {
    const consentKey = `quizify_consent_${quizId}`;
    const consent = localStorage.getItem(consentKey);
    
    if (!consent) {
      return null;
    }

    try {
      return JSON.parse(consent);
    } catch (error) {
      console.warn('Failed to parse user consent:', error);
      return null;
    }
  }

  /**
   * Anonymize quiz attempt for analytics
   */
  static anonymizeForAnalytics(attempt: QuizAttempt): Partial<QuizAttempt> {
    return {
      id: attempt.id,
      quizId: attempt.quizId,
      score: attempt.score,
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      createdAt: attempt.createdAt
      // Exclude userName, userEmail, answers for privacy
    };
  }

  /**
   * Check if data should be retained based on settings
   */
  static shouldRetainData(attempt: QuizAttempt, settings: PrivacySettings): boolean {
    if (!settings.retentionDays || settings.retentionDays <= 0) {
      return false;
    }

    const attemptDate = new Date(attempt.createdAt);
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - settings.retentionDays);

    return attemptDate > retentionDate;
  }

  /**
   * Clean up old data based on retention settings
   */
  static cleanupOldData(attempts: QuizAttempt[], settings: PrivacySettings): QuizAttempt[] {
    return attempts.filter(attempt => this.shouldRetainData(attempt, settings));
  }

  /**
   * Export user data (GDPR compliance)
   */
  static exportUserData(userName: string): any {
    try {
      // Get all quiz attempts for this user
      const attempts = JSON.parse(localStorage.getItem('quizify_attempts') || '[]');
      const userAttempts = attempts.filter((attempt: QuizAttempt) => 
        attempt.userName === userName
      );

      // Get user consent records
      const consentKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('quizify_consent_')
      );
      const userConsents = consentKeys.map(key => {
        try {
          const consent = JSON.parse(localStorage.getItem(key) || '{}');
          return consent.userName === userName ? consent : null;
        } catch {
          return null;
        }
      }).filter(Boolean);

      // Get privacy settings
      const privacySettings = this.loadPrivacySettings();

      return {
        userName,
        exportDate: new Date().toISOString(),
        quizAttempts: userAttempts,
        userConsents,
        privacySettings,
        privacyPolicy: this.PRIVACY_POLICY
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }

  /**
   * Delete user data (GDPR compliance)
   */
  static deleteUserData(userName: string): boolean {
    try {
      // Delete quiz attempts
      const attempts = JSON.parse(localStorage.getItem('quizify_attempts') || '[]');
      const filteredAttempts = attempts.filter((attempt: QuizAttempt) => 
        attempt.userName !== userName
      );
      localStorage.setItem('quizify_attempts', JSON.stringify(filteredAttempts));

      // Delete consent records
      const consentKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('quizify_consent_')
      );
      consentKeys.forEach(key => {
        try {
          const consent = JSON.parse(localStorage.getItem(key) || '{}');
          if (consent.userName === userName) {
            localStorage.removeItem(key);
          }
        } catch {
          // Ignore malformed consent records
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to delete user data:', error);
      return false;
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
   * Validate privacy settings
   */
  static validatePrivacySettings(settings: PrivacySettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.retentionDays < 0 || settings.retentionDays > 3650) {
      errors.push('Retention days must be between 0 and 3650 (10 years)');
    }

    if (typeof settings.allowAnalytics !== 'boolean') {
      errors.push('Analytics consent must be a boolean');
    }

    if (typeof settings.allowPersonalInfo !== 'boolean') {
      errors.push('Personal info consent must be a boolean');
    }

    if (typeof settings.allowDataSharing !== 'boolean') {
      errors.push('Data sharing consent must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate privacy summary for user display
   */
  static generatePrivacySummary(settings: PrivacySettings): string {
    const items = [];
    
    if (settings.allowAnalytics) {
      items.push('Analytics and performance tracking');
    }
    
    if (settings.allowPersonalInfo) {
      items.push('Personal information storage');
    }
    
    if (settings.allowDataSharing) {
      items.push('Data sharing with third parties');
    }
    
    if (settings.allowPerformanceTracking) {
      items.push('Performance improvement tracking');
    }
    
    if (settings.allowComparativeAnalysis) {
      items.push('Comparative analysis with other users');
    }

    const retentionText = settings.retentionDays > 0 
      ? `Data retention for ${settings.retentionDays} days`
      : 'Immediate data deletion';

    return items.length > 0 
      ? `You consent to: ${items.join(', ')}. ${retentionText}.`
      : `Minimal data collection only. ${retentionText}.`;
  }
}
