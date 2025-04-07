import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { ShieldAlert, XCircle, Loader2 } from 'lucide-react';

interface TestFunctionsTabProps {
  isUserBorrower: boolean;
  processingAction: string | null;
  loanStatus: number | string;
  handleSimulateDefault: () => Promise<void>;
}

const TestFunctionsTab: React.FC<TestFunctionsTabProps> = ({
  isUserBorrower,
  processingAction,
  loanStatus,
  handleSimulateDefault
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldAlert className="h-5 w-5 mr-2" /> Test Functions
        </CardTitle>
        <CardDescription>
          These functions are for testing purposes only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="mb-4" variant="default">
            <AlertTitle>Testing Only</AlertTitle>
            <AlertDescription>
              These functions are only for development and testing purposes.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isUserBorrower && (
              <Button 
                variant="destructive"
                disabled={processingAction !== null || (loanStatus !== 'PAID' && loanStatus !== 2)}
                onClick={handleSimulateDefault}
              >
                {processingAction === 'simulateDefault' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Simulate Default
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestFunctionsTab; 