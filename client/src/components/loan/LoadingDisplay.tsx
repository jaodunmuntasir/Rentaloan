import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingDisplayProps {
  message?: string;
}

const LoadingDisplay: React.FC<LoadingDisplayProps> = ({ 
  message = "Loading loan request details..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default LoadingDisplay; 