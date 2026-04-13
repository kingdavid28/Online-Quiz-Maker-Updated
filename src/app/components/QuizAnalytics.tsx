import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { api, Quiz, QuizAnalytics as Analytics } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  Award, 
  Clock,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function QuizAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, loading: authLoading } = useAuth();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && accessToken) {
      loadData();
    }
  }, [id, accessToken]);

  const loadData = async () => {
    if (!id || !accessToken) return;

    setLoading(true);
    try {
      const [quizData, analyticsData] = await Promise.all([
        api.getQuiz(accessToken, id),
        api.getQuizAnalytics(accessToken, id),
      ]);
      setQuiz(quizData);
      setAnalytics(analyticsData);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error('Error loading analytics:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 animate-pulse text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!quiz || !analytics) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Helper function to format user name for better readability
  const formatUserName = (userName: string) => {
    // Handle empty or null names
    if (!userName || userName.trim() === '') {
      return 'Unknown User';
    }
    
    const trimmed = userName.trim();
    
    // If it's a system-generated ID, create a friendly display name
    if (trimmed.includes('user_')) {
      const parts = trimmed.split('_');
      if (parts.length >= 2) {
        const idPart = parts[1];
        // Take first 6 characters and add a friendly prefix
        const shortId = idPart.substring(0, 6);
        return `Guest ${shortId}`;
      }
    }
    
    // Check for hex-based system IDs
    if (trimmed.match(/^[a-f0-9]{8,}/i)) {
      return `Guest ${trimmed.substring(0, 6)}`;
    }
    
    // For real names, ensure proper formatting
    // Only apply capitalization if it looks like a real name (not all same character)
    if (!trimmed.includes('user_') && !trimmed.match(/^[a-f0-9]{8,}/i)) {
      // Check if it's likely a real name (has vowels and varied characters)
      const hasVowels = /[aeiou]/i.test(trimmed);
      const hasVariedChars = !/^[a-zA-Z]{3,}$/.test(trimmed) || 
        new Set(trimmed.toLowerCase()).size > 2;
      
      if (hasVowels && hasVariedChars) {
        // Apply proper capitalization for real names
        return trimmed
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
    
    // If name is too long, truncate it
    if (trimmed.length > 20) {
      return trimmed.substring(0, 17) + '...';
    }
    
    // Return as-is if it's already reasonable
    return trimmed;
  };

  // Prepare chart data
  const questionPerformanceData = analytics.questionStats.map((stat, index) => ({
    name: `Q${index + 1}`,
    percentage: isNaN(stat.correctPercentage) || !isFinite(stat.correctPercentage) ? 0 : Math.round(stat.correctPercentage),
  }));

  const passFailData = [
    { name: 'Passed', value: Math.round(analytics.passRate), color: '#10b981' },
    { name: 'Failed', value: Math.round(100 - analytics.passRate), color: '#ef4444' },
  ];

  const recentScoresData = analytics.recentAttempts
    .slice(0, 10)
    .reverse()
    .map((attempt, index) => ({
      name: `#${index + 1}`,
      score: attempt.score,
    }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {quiz?.title || 'Quiz'} Analytics
          </h1>
          <p className="text-gray-600">
            Performance report and analytics overview
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Attempts</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        {analytics.totalAttempts}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-bold">📊</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        {Math.round(analytics.averageScore)}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pass Rate</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        {Math.round(analytics.passRate)}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">🎯</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg. Time</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        {formatTime(Math.round(analytics.averageTimeSpent))}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 font-bold">⏱️</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Question Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Question Performance</CardTitle>
                  <CardDescription>Percentage of correct answers per question</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={questionPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Bar dataKey="percentage" fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pass/Fail Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Pass/Fail Distribution</CardTitle>
                  <CardDescription>Overall pass rate for this quiz</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={passFailData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {passFailData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Score Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Score Trends</CardTitle>
                <CardDescription>Last 10 quiz attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={recentScoresData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Question Difficulty Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Question Difficulty Analysis</CardTitle>
                <CardDescription>Identify challenging questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.questionStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Question {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{
                              width: `${isNaN(stat.correctPercentage) || !isFinite(stat.correctPercentage) ? 0 : Math.round(stat.correctPercentage)}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {isNaN(stat.correctPercentage) || !isFinite(stat.correctPercentage) ? 0 : Math.round(stat.correctPercentage)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Attempts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Attempts</CardTitle>
                <CardDescription>Latest quiz submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-gray-600">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Score</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {analytics.recentAttempts.map((attempt) => (
                        <tr key={attempt.id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-indigo-600">
                                  {formatUserName(attempt.userName).charAt(0)}
                                </span>
                              </div>
                              <span className="font-medium">{formatUserName(attempt.userName)}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="font-semibold">{attempt.score}%</span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              attempt.passed 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {attempt.passed ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                          <td className="py-3">{formatTime(attempt.timeSpent)}</td>
                          <td className="py-3 text-gray-600">
                            {new Date(attempt.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { 
  icon: React.ReactNode; 
  title: string; 
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
