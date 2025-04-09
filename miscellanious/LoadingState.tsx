import React from 'react';
import { Card, CardContent } from '../../ui/card';
import { Loader2 } from 'lucide-react';

const LoadingState: React.FC = () => {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-medium">Loading Loan Agreement</h3>
        <p className="text-muted-foreground text-sm text-center mt-2">
          This may take a moment while we fetch data from the blockchain and database.
        </p>
      </CardContent>
    </Card>
  );
};

export default LoadingState; 