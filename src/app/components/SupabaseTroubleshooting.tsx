import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

export function SupabaseTroubleshooting() {
  const openSupabaseAuth = () => {
    window.open('https://supabase.com/dashboard/project/lqgtjmndgfuyabnghgdy/auth/users', '_blank');
  };

  const openSupabaseSettings = () => {
    window.open('https://supabase.com/dashboard/project/lqgtjmndgfuyabnghgdy/settings/auth', '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <CardTitle className="text-2xl text-red-900">Authentication Connection Error</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            Unable to connect to Supabase authentication service. Follow these steps to resolve the issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Most Common Issue */}
          <div className="bg-white rounded-lg p-5 border-2 border-amber-300">
            <h3 className="font-bold text-lg mb-3 text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Most Common Issue: Email Confirmation Enabled
            </h3>
            <p className="text-gray-700 mb-4">
              Supabase has email confirmation enabled by default. This requires users to verify their email before they can log in, 
              but many email providers block confirmation emails during development.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Open Supabase Auth Settings</h4>
                  <p className="text-sm text-gray-600 mb-2">Click below to open your project's authentication settings</p>
                  <Button onClick={openSupabaseSettings} size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Auth Settings
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Disable Email Confirmation (For Development)</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>In the Authentication settings page:</p>
                    <ol className="list-disc list-inside ml-3 space-y-1">
                      <li>Scroll to <strong>"Email Auth"</strong> section</li>
                      <li>Find <strong>"Enable email confirmations"</strong></li>
                      <li>Toggle it <strong>OFF</strong></li>
                      <li>Click <strong>"Save"</strong> button</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Try Signing Up Again</h4>
                  <p className="text-sm text-gray-600">After disabling email confirmation, return to the signup page and try again</p>
                </div>
              </div>
            </div>
          </div>

          {/* Other Issues */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Other Possible Issues:</h3>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Check Internet Connection
              </h4>
              <p className="text-sm text-gray-600">
                Make sure you have a stable internet connection. The error occurs when the browser can't reach Supabase servers.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Verify Supabase Project is Active
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Check that your Supabase project is running and not paused:
              </p>
              <Button onClick={openSupabaseAuth} size="sm" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Dashboard
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Browser Extensions/Ad Blockers
              </h4>
              <p className="text-sm text-gray-600">
                Some browser extensions or ad blockers may interfere with Supabase requests. Try disabling them temporarily.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                CORS Issues (Development)
              </h4>
              <p className="text-sm text-gray-600">
                If you're running locally, ensure your development server URL is allowed in Supabase. Go to Settings → API → Site URL.
              </p>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Still having issues?</strong> Check the browser console (F12) for more detailed error messages, 
              or visit the Supabase documentation for additional troubleshooting steps.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
