import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react';

interface AuthErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseLocalMode: () => void;
  error?: any;
}

export function AuthErrorModal({ isOpen, onClose, onUseLocalMode }: AuthErrorModalProps) {
  if (!isOpen) return null;

  const openSupabaseSettings = () => {
    window.open('https://supabase.com/dashboard/project/lqgtjmndgfuyabnghgdy/settings/auth', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl text-red-900">Supabase Connection Failed</CardTitle>
              <CardDescription className="text-red-700 mt-1">
                Unable to connect to Supabase authentication. This is usually caused by email confirmation being enabled.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Quick Fix Option */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
            <h3 className="font-bold text-lg mb-2 text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Option 1: Use Local Mode (Instant Fix)
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Continue without Supabase using local browser storage. Perfect for testing! 
              Your data will be saved in your browser.
            </p>
            <Button 
              onClick={onUseLocalMode}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              ✓ Switch to Local Mode & Continue
            </Button>
          </div>

          {/* Permanent Fix */}
          <div className="border-2 border-blue-200 rounded-lg p-5">
            <h3 className="font-bold text-lg mb-3 text-blue-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Option 2: Fix Supabase Settings (Permanent Solution)
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Open Supabase Authentication Settings</h4>
                  <Button 
                    onClick={openSupabaseSettings}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Supabase Settings
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Disable Email Confirmation</h4>
                  <ol className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
                    <li>Scroll to the <strong>"Email Auth"</strong> section</li>
                    <li>Find <strong>"Enable email confirmations"</strong></li>
                    <li>Toggle it <strong>OFF</strong></li>
                    <li>Click <strong>"Save"</strong></li>
                  </ol>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Close This Modal & Try Again</h4>
                  <p className="text-sm text-gray-600">
                    After saving the settings, close this modal and try signing up again.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Why is this happening?</strong> Supabase requires email confirmation by default. 
              When enabled, users must click a link in their email before they can log in. Many email 
              providers block these emails during development, causing the connection to fail.
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close (I'll fix it myself)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}