import { useState, useCallback } from 'react';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toastData: Toast) => {
    // For now, just use console log or alert
    // You can later integrate with a proper toast notification library
    if (toastData.variant === 'destructive') {
      console.error(`${toastData.title}: ${toastData.description}`);
    } else {
      console.log(`${toastData.title}: ${toastData.description}`);
    }
    
    // In a real implementation, you'd add this to the toasts state
    // and render them in a toast container component
    setToasts(prev => [...prev, toastData]);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 3000);
  }, []);

  return { toast, toasts };
}
