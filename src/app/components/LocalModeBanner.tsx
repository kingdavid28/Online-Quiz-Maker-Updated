import { AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

export function LocalModeBanner() {
  const [isVisible, setIsVisible] = useState(true);
  
  // Always hide local mode banner since we're always online
  if (!isVisible) return null;

  const switchBackToSupabase = () => {
    localStorage.removeItem('quizify_use_local_mode');
    window.location.reload();
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2 relative">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            <strong>Local Mode:</strong> You're using browser storage instead of Supabase. 
            Data is saved locally and won't sync across devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-amber-600 hover:text-white text-xs"
            onClick={switchBackToSupabase}
          >
            Switch to Supabase
          </Button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-amber-600 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
