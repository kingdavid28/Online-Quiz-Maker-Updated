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

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { signup, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, name);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.message === 'EMAIL_CONFIRMATION_REQUIRED') {
        toast.success('Account created! Please check your email to confirm your account before logging in.', {
          duration: 7000,
        });
        // Redirect to login page after a delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (error.message.includes('User already registered') || error.message.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.', {
          duration: 5000,
        });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(error.message || 'Signup failed. Please try again.');
        console.error('Signup error:', error);
        
        // Show error modal for network/connection errors
        if (error.message?.includes('Network error') || error.message?.includes('Unable to connect') || error.message?.includes('Failed to fetch')) {
          setShowErrorModal(true);
        }
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
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Get started with Quizify today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
            
            {/* Troubleshooting Alert */}
            {showTroubleshooting && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Connection Issue Detected</h4>
                    <p className="text-sm text-amber-800 mb-3">
                      This error usually means email confirmation is enabled in Supabase.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-900">Quick Fix:</p>
                      <ol className="text-sm text-amber-800 space-y-1 ml-4 list-decimal">
                        <li>Go to Supabase → Authentication → Settings</li>
                        <li>Find "Enable email confirmations"</li>
                        <li>Toggle it OFF</li>
                        <li>Save and try again</li>
                      </ol>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => window.open('https://supabase.com/dashboard/project/lqgtjmndgfuyabnghgdy/settings/auth', '_blank')}
                      >
                        Open Supabase Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-gray-600 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
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