import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Brain, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthErrorModal } from './AuthErrorModal';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Better error message handling
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        toast.error(errorMessage, {
          description: 'Need an account? Click "Sign up" below or use the demo account.',
          duration: 5000,
        });
      } else if (error.message?.includes('Network error') || error.message?.includes('Unable to connect') || error.message?.includes('Failed to fetch')) {
        setShowErrorModal(true);
        errorMessage = error.message;
        toast.error(errorMessage);
      } else {
        toast.error(error.message || errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@quizify.app');
    setPassword('demo123456');
    setLoading(true);
    
    try {
      await login('demo@quizify.app', 'demo123456');
      toast.success('Logged in as demo user!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Demo login error:', error);
      
      // If demo account doesn't exist, guide user to create account or use local mode
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Demo account not set up. Please sign up for a new account.', {
          description: 'Click "Sign up" below to create your account.',
          duration: 5000,
        });
      } else {
        toast.error('Demo login failed. Please try signing up instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseLocalMode = async () => {
    setShowErrorModal(false);
    setLoading(true);
    
    try {
      // Temporarily disable Supabase and use local storage
      localStorage.setItem('quizify_use_local_mode', 'true');
      
      // Reload the page to switch to local mode
      toast.success('Switching to local mode...', { duration: 2000 });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error('Failed to switch to local mode');
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Brain className="w-10 h-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Quizify</h1>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Helper message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-900">
                <strong>First time?</strong> Click "Sign up" below to create your account. You'll be able to create quizzes right after signing up!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-gray-600 text-center">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
            {showTroubleshooting && (
              <div className="mt-4">
                <AlertCircle className="w-5 h-5 text-red-500 inline-block mr-2" />
                <span className="text-sm text-red-500">
                  Network error: Please check your internet connection and try again.
                </span>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
      <AuthErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onUseLocalMode={handleUseLocalMode}
      />
    </div>
  );
}