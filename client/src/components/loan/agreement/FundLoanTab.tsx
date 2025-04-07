import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { PiggyBank, Loader2 } from 'lucide-react';

interface FundLoanTabProps {
  contractAddress: string;
  loanAmount: string;
  processingAction: string | null;
  handleFundLoan: () => Promise<void>;
}

const FundLoanTab: React.FC<FundLoanTabProps> = ({
  contractAddress,
  loanAmount,
  processingAction,
  handleFundLoan
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PiggyBank className="h-5 w-5 mr-2" /> Fund This Loan
        </CardTitle>
        <CardDescription>Provide funds to activate the loan</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle>Funding Information</AlertTitle>
          <AlertDescription>
            As the lender, you need to fund this loan to activate it. The borrower will be able to activate the loan once funds are available.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Funding Amount</p>
              <p className="text-3xl font-bold">{loanAmount} ETH</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contract Address:</span>
              <span className="font-mono">{contractAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span>{loanAmount} ETH</span>
            </div>
          </div>
        </div>
        
        <Alert>
          <AlertDescription>
            This will send {loanAmount} ETH to the loan contract. Make sure you have enough ETH in your wallet plus gas fees.
          </AlertDescription>
        </Alert>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={processingAction !== null}
          onClick={handleFundLoan}
        >
          {processingAction === 'fundLoan' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <PiggyBank className="mr-2 h-4 w-4" />
              Fund Loan ({loanAmount} ETH)
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FundLoanTab; 