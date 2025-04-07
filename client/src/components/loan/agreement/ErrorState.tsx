import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { ArrowLeft } from 'lucide-react';

interface ErrorStateProps {
  error: string | null;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Error</CardTitle>
        <CardDescription>Failed to load loan agreement details</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Could not load loan details"}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <a href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ErrorState; 