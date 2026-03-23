import { AlertCircle, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

interface SchemaErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SchemaErrorModal({ isOpen, onClose }: SchemaErrorModalProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = async () => {
    const instructions = `How to fix the schema cache error:

1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
2. Select your project
3. Click "Settings" in the left sidebar
4. Click "API" section
5. Scroll down and find the "Reload schema" button
6. Click "Reload schema" and wait for confirmation
7. Come back here and try saving again

This refreshes PostgREST's schema cache and should fix the PGRST204 error.`;

    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      toast.success('Instructions copied!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              Database Schema Cache Error
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Supabase needs to reload its API schema cache
            </p>
          </div>
        </div>

        {/* Problem Explanation */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">What's happening?</h3>
          <p className="text-sm text-yellow-800">
            You ran the database setup SQL successfully, but Supabase's PostgREST API layer 
            hasn't refreshed its understanding of your database structure. The database has the 
            correct columns, but the API doesn't know about them yet.
          </p>
        </div>

        {/* Solution */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>
            Solution Options
          </h3>
          
          <div className="space-y-3 text-sm text-blue-900">
            <div>
              <strong className="block mb-2">Option 1: Manual Schema Reload (Try First)</strong>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Go to <strong>Settings → API</strong> in your Supabase Dashboard</li>
                <li>Scroll down and click the <strong>"Reload schema"</strong> button</li>
                <li>Wait for the confirmation message</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            
            <div className="pt-2 border-t border-blue-300">
              <strong className="block mb-2">Option 2: Use RPC Workaround (If Option 1 Fails)</strong>
              <p className="mb-2">
                If schema reload doesn't work, use the Database Diagnostic tool on the setup page 
                to install RPC functions that bypass the schema cache entirely.
              </p>
              <p className="text-xs text-blue-800">
                The diagnostic tool will detect the issue and provide the exact SQL needed to fix it.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            className="flex-1 gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Supabase Dashboard
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate('/dashboard');
              setTimeout(() => {
                toast.info('The database setup page should appear automatically. Look for the Database Diagnostic Tool section.');
              }, 500);
            }}
            variant="default"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            Go to Diagnostic Tool
          </Button>
        </div>
        
        <div className="flex justify-center">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Instructions
              </>
            )}
          </Button>
        </div>

        {/* Alternative */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <strong>Alternative:</strong> If the reload button doesn't work, wait 5-10 minutes 
          for Supabase to automatically refresh its schema cache, then try again.
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} variant="ghost">
            I understand, close this
          </Button>
        </div>
      </div>
    </div>
  );
}