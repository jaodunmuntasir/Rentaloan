import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { DollarSign, Loader2 } from 'lucide-react';

interface MakePaymentTabProps {
  contractAddress: string;
  installmentAmount: string;
  nextPaymentMonth: number;
  daysUntilNextPayment: number;
  processingAction: string | null;
  formatDate: (date: Date) => string;
  handlePayment: (month: number, amount: string) => Promise<void>;
}

const MakePaymentTab: React.FC<MakePaymentTabProps> = ({
  contractAddress,
  installmentAmount,
  nextPaymentMonth,
  daysUntilNextPayment,
  processingAction,
  formatDate,
  handlePayment
}) => {
  // Calculate next payment date
  const nextPaymentDate = new Date();
  nextPaymentDate.setDate(nextPaymentDate.getDate() + daysUntilNextPayment);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" /> Make a Payment
        </CardTitle>
        <CardDescription>Pay your next installment</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle>Payment Information</AlertTitle>
          <AlertDescription>
            Your next payment is due in {daysUntilNextPayment} days on {formatDate(nextPaymentDate)}.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Payment Amount</p>
              <p className="text-3xl font-bold">{installmentAmount} ETH</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contract Address:</span>
              <span className="font-mono">{contractAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment for Month:</span>
              <span>{nextPaymentMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span>{installmentAmount} ETH</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={processingAction !== null}
          onClick={() => handlePayment(nextPaymentMonth, installmentAmount)}
        >
          {processingAction === 'payment' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Pay {installmentAmount} ETH
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MakePaymentTab; 