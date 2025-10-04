import { AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
}

export default function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive mb-1">Analysis Failed</h3>
          <p className="text-sm text-destructive/80">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Make sure the backend is running on http://localhost:8000
          </p>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}