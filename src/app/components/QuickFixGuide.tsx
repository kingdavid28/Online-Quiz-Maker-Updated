import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function QuickFixGuide() {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Common Issues & Quick Fixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Login Issues */}
        <div className="pb-3 border-b">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">Login Error</span>
            "Invalid login credentials"
          </h4>
          <div className="text-sm text-gray-700 space-y-1 ml-6">
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>If you don't have an account, click <strong>"Sign up"</strong> to create one</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Check that your email and password are correct</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>If you signed up recently, check your email for a confirmation link</span>
            </p>
          </div>
        </div>

        {/* Schema Cache Error */}
        <div className="pb-3 border-b">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded">Schema Error</span>
            PGRST204 or "Could not find the 'questions' column"
          </h4>
          <div className="text-sm text-gray-700 space-y-1 ml-6">
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Option 1:</strong> Go to Supabase Dashboard → Settings → API → Click "Reload schema"</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Option 2:</strong> Use the Database Diagnostic Tool (shown above) to install RPC workaround</span>
            </p>
          </div>
        </div>

        {/* Table Missing Error */}
        <div className="pb-3">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">Setup Needed</span>
            "Could not find the table"
          </h4>
          <div className="text-sm text-gray-700 space-y-1 ml-6">
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>This page should appear automatically - run the SQL setup code shown above</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>After running SQL, click "I've Set Up the Database - Refresh"</span>
            </p>
          </div>
        </div>

        {/* Help Link */}
        <div className="pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://supabase.com/docs/guides/database', '_blank')}
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Supabase Database Documentation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
