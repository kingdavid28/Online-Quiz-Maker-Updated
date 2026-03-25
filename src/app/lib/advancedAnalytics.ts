import { QuizAttempt, Quiz, Question } from './api';
import { PrivacyManager } from './privacyManager';

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  type: string;
  difficulty: number; // 0-1 scale, higher = harder
  correctRate: number; // 0-1 scale
  averageTime: number; // seconds
  commonWrongAnswers: Array<{
    answer: string;
    frequency: number;
    percentage: number;
  }>;
  discriminationIndex: number; // How well question separates high/low performers
  totalAttempts: number;
  correctAttempts: number;
  averageScore: number;
}

export interface UserProgress {
  userId: string;
  userName: string;
  totalQuizzes: number;
  averageScore: number;
  improvementTrend: number; // positive = improving, negative = declining
  strengthAreas: string[];
  weakAreas: string[];
  recommendedTopics: string[];
  timeSpentPerQuestion: number;
  accuracyByQuestionType: Record<string, number>;
  recentPerformance: {
    quizId: string;
    score: number;
    timestamp: string;
  }[];
  learningVelocity: number; // How quickly user is learning
  consistency: number; // How consistent performance is
}

export interface ComparativeAnalytics {
  percentileRank: number;
  averageScore: number;
  topPerformers: number;
  totalParticipants: number;
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  performanceComparison: {
    aboveAverage: boolean;
    scoreDifference: number;
    rankPosition: number;
  };
}

export interface QuizInsights {
  overallDifficulty: number;
  engagementLevel: number;
  completionRate: number;
  averageTimeSpent: number;
  dropOffPoints: Array<{
    questionIndex: number;
    dropOffRate: number;
  }>;
  improvementSuggestions: string[];
  questionQualityScores: Array<{
    questionId: string;
    qualityScore: number;
    issues: string[];
  }>;
}

export interface AdvancedQuizAnalytics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  questionAnalytics: QuestionAnalytics[];
  userProgressData: UserProgress[];
  comparativeData: ComparativeAnalytics;
  insights: QuizInsights;
  trends: {
    dailyAttempts: Array<{
      date: string;
      count: number;
    }>;
    scoreTrends: Array<{
      date: string;
      averageScore: number;
    }>;
    difficultyTrends: Array<{
      date: string;
      averageDifficulty: number;
    }>;
  };
  generatedAt: string;
}

/**
 * Advanced Analytics Engine for comprehensive quiz analysis
 */
export class AdvancedAnalytics {
  /**
   * Calculate comprehensive quiz analytics
   */
  static async calculateQuizAnalytics(
    quizId: string,
    attempts: QuizAttempt[],
    quiz: Quiz
  ): Promise<AdvancedQuizAnalytics> {
    // Filter and validate attempts
    const validAttempts = this.validateAndFilterAttempts(attempts);
    
    // Calculate question-level analytics
    const questionAnalytics = this.calculateQuestionAnalytics(validAttempts, quiz);
    
    // Calculate user progress data
    const userProgressData = this.calculateUserProgress(validAttempts);
    
    // Calculate comparative analytics
    const comparativeData = this.calculateComparativeAnalytics(validAttempts);
    
    // Generate insights
    const insights = this.generateInsights(validAttempts, quiz, questionAnalytics);
    
    // Calculate trends
    const trends = this.calculateTrends(validAttempts);

    return {
      quizId,
      quizTitle: quiz.title,
      totalAttempts: validAttempts.length,
      questionAnalytics,
      userProgressData,
      comparativeData,
      insights,
      trends,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Validate and filter attempts for analytics
   */
  private static validateAndFilterAttempts(attempts: QuizAttempt[]): QuizAttempt[] {
    return attempts.filter(attempt => {
      // Remove incomplete attempts
      if (!attempt.answers || attempt.answers.length === 0) {
        return false;
      }

      // Remove attempts with invalid data
      if (attempt.score < 0 || attempt.score > 100) {
        return false;
      }

      // Remove attempts with unrealistic timing
      if (attempt.timeSpent < 0 || attempt.timeSpent > 7200) { // Max 2 hours
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate question-level analytics
   */
  private static calculateQuestionAnalytics(
    attempts: QuizAttempt[],
    quiz: Quiz
  ): QuestionAnalytics[] {
    const analytics: QuestionAnalytics[] = [];

    quiz.questions.forEach((question, index) => {
      const questionData = this.analyzeQuestion(question, index, attempts);
      analytics.push(questionData);
    });

    return analytics;
  }

  /**
   * Analyze individual question
   */
  private static analyzeQuestion(
    question: Question,
    index: number,
    attempts: QuizAttempt[]
  ): QuestionAnalytics {
    const questionAttempts = attempts.map(attempt => ({
      answer: attempt.answers[index],
      correct: attempt.answers[index] === question.correctAnswer,
      timeSpent: attempt.timeSpent / attempt.totalQuestions, // Approximate per question
      score: attempt.score
    }));

    const totalAttempts = questionAttempts.length;
    const correctAttempts = questionAttempts.filter(qa => qa.correct).length;
    const correctRate = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;
    const averageTime = totalAttempts > 0 
      ? questionAttempts.reduce((sum, qa) => sum + qa.timeSpent, 0) / totalAttempts 
      : 0;

    // Calculate difficulty (0 = easy, 1 = hard)
    const difficulty = this.calculateQuestionDifficulty(correctRate, averageTime);

    // Find common wrong answers
    const commonWrongAnswers = this.findCommonWrongAnswers(questionAttempts, question);

    // Calculate discrimination index
    const discriminationIndex = this.calculateDiscriminationIndex(questionAttempts);

    // Calculate average score for this question
    const averageScore = totalAttempts > 0 
      ? questionAttempts.reduce((sum, qa) => sum + qa.score, 0) / totalAttempts 
      : 0;

    return {
      questionId: `q_${index}`,
      questionText: question.question,
      type: question.type,
      difficulty,
      correctRate,
      averageTime,
      commonWrongAnswers,
      discriminationIndex,
      totalAttempts,
      correctAttempts,
      averageScore
    };
  }

  /**
   * Calculate question difficulty based on correct rate and time
   */
  private static calculateQuestionDifficulty(correctRate: number, averageTime: number): number {
    // Base difficulty from correct rate (inverse relationship)
    let difficulty = 1 - correctRate;

    // Adjust for time spent (longer time might indicate harder question)
    const timeFactor = Math.min(averageTime / 60, 1); // Normalize to 0-1 scale (max 1 minute)
    difficulty = difficulty * 0.7 + timeFactor * 0.3;

    return Math.max(0, Math.min(1, difficulty));
  }

  /**
   * Find common wrong answers
   */
  private static findCommonWrongAnswers(
    questionAttempts: any[],
    question: Question
  ): Array<{ answer: string; frequency: number; percentage: number }> {
    const wrongAnswers = questionAttempts
      .filter(qa => !qa.correct && qa.answer !== null && qa.answer !== undefined)
      .map(qa => qa.answer.toString());

    const answerCounts = wrongAnswers.reduce((acc, answer) => {
      acc[answer] = (acc[answer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalWrong = wrongAnswers.length;

    return Object.entries(answerCounts)
      .map(([answer, frequency]) => ({
        answer,
        frequency,
        percentage: totalWrong > 0 ? (frequency / totalWrong) * 100 : 0
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5 wrong answers
  }

  /**
   * Calculate discrimination index
   */
  private static calculateDiscriminationIndex(questionAttempts: any[]): number {
    if (questionAttempts.length < 10) return 0; // Need sufficient data

    // Sort by overall score
    const sortedAttempts = questionAttempts.sort((a, b) => b.score - a.score);
    const upperCount = Math.floor(sortedAttempts.length * 0.27); // Top 27%
    const lowerCount = Math.floor(sortedAttempts.length * 0.27); // Bottom 27%

    const upperGroup = sortedAttempts.slice(0, upperCount);
    const lowerGroup = sortedAttempts.slice(-lowerCount);

    const upperCorrectRate = upperGroup.filter(qa => qa.correct).length / upperGroup.length;
    const lowerCorrectRate = lowerGroup.filter(qa => qa.correct).length / lowerGroup.length;

    return upperCorrectRate - lowerCorrectRate;
  }

  /**
   * Calculate user progress data
   */
  private static calculateUserProgress(attempts: QuizAttempt[]): UserProgress[] {
    const userMap = new Map<string, QuizAttempt[]>();

    // Group attempts by user
    attempts.forEach(attempt => {
      const userKey = attempt.userName || 'anonymous';
      if (!userMap.has(userKey)) {
        userMap.set(userKey, []);
      }
      userMap.get(userKey)!.push(attempt);
    });

    // Calculate progress for each user
    return Array.from(userMap.entries()).map(([userName, userAttempts]) => 
      this.calculateIndividualProgress(userName, userAttempts)
    );
  }

  /**
   * Calculate individual user progress
   */
  private static calculateIndividualProgress(
    userName: string,
    attempts: QuizAttempt[]
  ): UserProgress {
    // Sort by date
    const sortedAttempts = attempts.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const totalQuizzes = sortedAttempts.length;
    const averageScore = sortedAttempts.reduce((sum, a) => sum + a.score, 0) / totalQuizzes;

    // Calculate improvement trend
    const improvementTrend = this.calculateImprovementTrend(sortedAttempts);

    // Identify strength and weak areas
    const { strengthAreas, weakAreas } = this.identifyStrengthWeakAreas(sortedAttempts);

    // Generate recommendations
    const recommendedTopics = this.generateRecommendations(sortedAttempts, weakAreas);

    // Calculate time spent per question
    const totalTime = sortedAttempts.reduce((sum, a) => sum + a.timeSpent, 0);
    const totalQuestions = sortedAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const timeSpentPerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0;

    // Calculate accuracy by question type
    const accuracyByQuestionType = this.calculateAccuracyByType(sortedAttempts);

    // Recent performance
    const recentPerformance = sortedAttempts
      .slice(-5)
      .map(a => ({
        quizId: a.quizId,
        score: a.score,
        timestamp: a.createdAt
      }));

    // Calculate learning velocity
    const learningVelocity = this.calculateLearningVelocity(sortedAttempts);

    // Calculate consistency
    const consistency = this.calculateConsistency(sortedAttempts);

    return {
      userId: userName.replace(/\s+/g, '_').toLowerCase(),
      userName,
      totalQuizzes,
      averageScore,
      improvementTrend,
      strengthAreas,
      weakAreas,
      recommendedTopics,
      timeSpentPerQuestion,
      accuracyByQuestionType,
      recentPerformance,
      learningVelocity,
      consistency
    };
  }

  /**
   * Calculate improvement trend
   */
  private static calculateImprovementTrend(attempts: QuizAttempt[]): number {
    if (attempts.length < 2) return 0;

    const firstHalf = attempts.slice(0, Math.floor(attempts.length / 2));
    const secondHalf = attempts.slice(Math.floor(attempts.length / 2));

    const firstAvg = firstHalf.reduce((sum, a) => sum + a.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, a) => sum + a.score, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  /**
   * Identify strength and weak areas
   */
  private static identifyStrengthWeakAreas(attempts: QuizAttempt[]): {
    strengthAreas: string[];
    weakAreas: string[];
  } {
    // This is a simplified version - in practice, you'd analyze by topic/question type
    const accuracyByType = this.calculateAccuracyByType(attempts);
    
    const strengthAreas: string[] = [];
    const weakAreas: string[] = [];

    Object.entries(accuracyByType).forEach(([type, accuracy]) => {
      if (accuracy >= 80) {
        strengthAreas.push(type);
      } else if (accuracy <= 60) {
        weakAreas.push(type);
      }
    });

    return { strengthAreas, weakAreas };
  }

  /**
   * Generate recommendations based on weak areas
   */
  private static generateRecommendations(attempts: QuizAttempt[], weakAreas: string[]): string[] {
    const recommendations: string[] = [];

    weakAreas.forEach(area => {
      switch (area) {
        case 'multiple-choice':
          recommendations.push('Practice eliminating wrong answers to improve multiple-choice performance');
          break;
        case 'true-false':
          recommendations.push('Focus on understanding key concepts to improve true/false accuracy');
          break;
        case 'short-answer':
          recommendations.push('Work on concise, precise answers for short-answer questions');
          break;
        default:
          recommendations.push(`Additional practice needed for ${area} questions`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue practicing to maintain your strong performance');
    }

    return recommendations;
  }

  /**
   * Calculate accuracy by question type
   */
  private static calculateAccuracyByType(attempts: QuizAttempt[]): Record<string, number> {
    const typeStats: Record<string, { correct: number; total: number }> = {};

    attempts.forEach(attempt => {
      // This would need question data to be accurate - simplified version
      const accuracy = attempt.score / 100;
      ['multiple-choice', 'true-false', 'short-answer'].forEach(type => {
        if (!typeStats[type]) {
          typeStats[type] = { correct: 0, total: 0 };
        }
        typeStats[type].total += 1;
        typeStats[type].correct += accuracy;
      });
    });

    const accuracyByType: Record<string, number> = {};
    Object.entries(typeStats).forEach(([type, stats]) => {
      accuracyByType[type] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    return accuracyByType;
  }

  /**
   * Calculate learning velocity
   */
  private static calculateLearningVelocity(attempts: QuizAttempt[]): number {
    if (attempts.length < 3) return 0;

    // Calculate rate of improvement per quiz
    const improvements: number[] = [];
    for (let i = 1; i < attempts.length; i++) {
      const improvement = attempts[i].score - attempts[i - 1].score;
      improvements.push(improvement);
    }

    return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
  }

  /**
   * Calculate consistency
   */
  private static calculateConsistency(attempts: QuizAttempt[]): number {
    if (attempts.length < 2) return 1;

    const scores = attempts.map(a => a.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Consistency is inverse of standard deviation (normalized)
    return Math.max(0, 1 - (standardDeviation / 100));
  }

  /**
   * Calculate comparative analytics
   */
  private static calculateComparativeAnalytics(attempts: QuizAttempt[]): ComparativeAnalytics {
    const scores = attempts.map(a => a.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Calculate score distribution
    const scoreDistribution = this.calculateScoreDistribution(scores);
    
    // Calculate percentile rank (using average score)
    const percentileRank = this.calculatePercentileRank(averageScore, scores);
    
    // Count top performers (90th percentile and above)
    const topPerformers = scores.filter(score => score >= 90).length;
    
    return {
      percentileRank,
      averageScore,
      topPerformers,
      totalParticipants: attempts.length,
      scoreDistribution,
      performanceComparison: {
        aboveAverage: averageScore >= 50,
        scoreDifference: averageScore - 50,
        rankPosition: Math.floor((percentileRank / 100) * attempts.length) + 1
      }
    };
  }

  /**
   * Calculate score distribution
   */
  private static calculateScoreDistribution(scores: number[]): Array<{
    range: string;
    count: number;
    percentage: number;
  }> {
    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 }
    ];

    const total = scores.length;

    return ranges.map(({ range, min, max }) => {
      const count = scores.filter(score => score >= min && score <= max).length;
      return {
        range,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    });
  }

  /**
   * Calculate percentile rank
   */
  private static calculatePercentileRank(score: number, allScores: number[]): number {
    const sortedScores = [...allScores].sort((a, b) => a - b);
    const index = sortedScores.findIndex(s => s >= score);
    return (index / sortedScores.length) * 100;
  }

  /**
   * Generate insights
   */
  private static generateInsights(
    attempts: QuizAttempt[],
    quiz: Quiz,
    questionAnalytics: QuestionAnalytics[]
  ): QuizInsights {
    const overallDifficulty = questionAnalytics.reduce((sum, qa) => sum + qa.difficulty, 0) / questionAnalytics.length;
    
    const engagementLevel = this.calculateEngagementLevel(attempts);
    
    const completionRate = this.calculateCompletionRate(attempts);
    
    const averageTimeSpent = attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length;
    
    const dropOffPoints = this.identifyDropOffPoints(attempts, quiz);
    
    const improvementSuggestions = this.generateImprovementSuggestions(questionAnalytics, attempts);
    
    const questionQualityScores = this.assessQuestionQuality(questionAnalytics);

    return {
      overallDifficulty,
      engagementLevel,
      completionRate,
      averageTimeSpent,
      dropOffPoints,
      improvementSuggestions,
      questionQualityScores
    };
  }

  /**
   * Calculate engagement level
   */
  private static calculateEngagementLevel(attempts: QuizAttempt[]): number {
    // Based on completion rate and average time spent
    const avgTime = attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length;
    const expectedTime = attempts.reduce((sum, a) => sum + a.totalQuestions * 30, 0) / attempts.length; // 30s per question
    
    return Math.min(1, avgTime / expectedTime);
  }

  /**
   * Calculate completion rate
   */
  private static calculateCompletionRate(attempts: QuizAttempt[]): number {
    const completed = attempts.filter(a => a.answers.length === a.totalQuestions).length;
    return attempts.length > 0 ? (completed / attempts.length) * 100 : 0;
  }

  /**
   * Identify drop-off points
   */
  private static identifyDropOffPoints(attempts: QuizAttempt[], quiz: Quiz): Array<{
    questionIndex: number;
    dropOffRate: number;
  }> {
    const dropOffPoints: Array<{ questionIndex: number; dropOffRate: number }> = [];
    
    for (let i = 0; i < quiz.questions.length - 1; i++) {
      const answeredCurrent = attempts.filter(a => a.answers.length > i).length;
      const answeredNext = attempts.filter(a => a.answers.length > i + 1).length;
      
      const dropOffRate = answeredCurrent > 0 
        ? ((answeredCurrent - answeredNext) / answeredCurrent) * 100 
        : 0;
      
      if (dropOffRate > 10) { // Significant drop-off
        dropOffPoints.push({ questionIndex: i, dropOffRate });
      }
    }
    
    return dropOffPoints;
  }

  /**
   * Generate improvement suggestions
   */
  private static generateImprovementSuggestions(
    questionAnalytics: QuestionAnalytics[],
    attempts: QuizAttempt[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Analyze question difficulty
    const hardQuestions = questionAnalytics.filter(qa => qa.difficulty > 0.8);
    const easyQuestions = questionAnalytics.filter(qa => qa.difficulty < 0.2);
    
    if (hardQuestions.length > questionAnalytics.length * 0.3) {
      suggestions.push('Consider reducing quiz difficulty - too many hard questions detected');
    }
    
    if (easyQuestions.length > questionAnalytics.length * 0.5) {
      suggestions.push('Quiz may be too easy - consider adding more challenging questions');
    }
    
    // Analyze completion rate
    const completionRate = this.calculateCompletionRate(attempts);
    if (completionRate < 70) {
      suggestions.push('Low completion rate - consider shortening quiz or reducing difficulty');
    }
    
    // Analyze question quality
    const poorQuestions = questionAnalytics.filter(qa => qa.discriminationIndex < 0.2);
    if (poorQuestions.length > 0) {
      suggestions.push(`${poorQuestions.length} questions have low discrimination - consider reviewing or replacing them`);
    }
    
    return suggestions;
  }

  /**
   * Assess question quality
   */
  private static assessQuestionQuality(
    questionAnalytics: QuestionAnalytics[]
  ): Array<{ questionId: string; qualityScore: number; issues: string[] }> {
    return questionAnalytics.map(qa => {
      const issues: string[] = [];
      let qualityScore = 100;
      
      // Check discrimination index
      if (qa.discriminationIndex < 0.2) {
        issues.push('Low discrimination - may not distinguish between performers');
        qualityScore -= 30;
      }
      
      // Check difficulty
      if (qa.difficulty > 0.9) {
        issues.push('Too difficult - most users get it wrong');
        qualityScore -= 20;
      } else if (qa.difficulty < 0.1) {
        issues.push('Too easy - most users get it right');
        qualityScore -= 10;
      }
      
      // Check common wrong answers
      if (qa.commonWrongAnswers.length > 0 && qa.commonWrongAnswers[0].percentage > 50) {
        issues.push('Distractor issue - one wrong answer is too common');
        qualityScore -= 15;
      }
      
      return {
        questionId: qa.questionId,
        qualityScore: Math.max(0, qualityScore),
        issues
      };
    });
  }

  /**
   * Calculate trends over time
   */
  private static calculateTrends(attempts: QuizAttempt[]): {
    dailyAttempts: Array<{ date: string; count: number }>;
    scoreTrends: Array<{ date: string; averageScore: number }>;
    difficultyTrends: Array<{ date: string; averageDifficulty: number }>;
  } {
    // Group attempts by date
    const dailyData = new Map<string, QuizAttempt[]>();
    
    attempts.forEach(attempt => {
      const date = new Date(attempt.createdAt).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(attempt);
    });

    const sortedDates = Array.from(dailyData.keys()).sort();

    const dailyAttempts = sortedDates.map(date => ({
      date,
      count: dailyData.get(date)!.length
    }));

    const scoreTrends = sortedDates.map(date => {
      const dayAttempts = dailyData.get(date)!;
      const averageScore = dayAttempts.reduce((sum, a) => sum + a.score, 0) / dayAttempts.length;
      return { date, averageScore };
    });

    // Difficulty trends would need question-level data - simplified version
    const difficultyTrends = scoreTrends.map(({ date, averageScore }) => ({
      date,
      averageDifficulty: 1 - (averageScore / 100) // Inverse relationship
    }));

    return {
      dailyAttempts,
      scoreTrends,
      difficultyTrends
    };
  }

  /**
   * Export analytics data for external analysis
   */
  static exportAnalytics(analytics: AdvancedQuizAnalytics): string {
    return JSON.stringify(analytics, null, 2);
  }

  /**
   * Generate summary report
   */
  static generateSummaryReport(analytics: AdvancedQuizAnalytics): string {
    const { quizTitle, totalAttempts, insights, comparativeData } = analytics;
    
    return `
Quiz Analytics Summary for: ${quizTitle}

Total Attempts: ${totalAttempts}
Overall Difficulty: ${(insights.overallDifficulty * 100).toFixed(1)}%
Completion Rate: ${insights.completionRate.toFixed(1)}%
Average Score: ${comparativeData.averageScore.toFixed(1)}%

Key Insights:
${insights.improvementSuggestions.map(suggestion => `• ${suggestion}`).join('\n')}

Performance Distribution:
${comparativeData.scoreDistribution.map(dist => 
  `${dist.range}: ${dist.count} attempts (${dist.percentage.toFixed(1)}%)`
).join('\n')}
    `.trim();
  }
}
