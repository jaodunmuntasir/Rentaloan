import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { ShieldAlert, XCircle, Loader2, Wallet, Coins } from 'lucide-react';
import { LoanAgreementStatus } from '../../../services/blockchain.service';

interface TestFunctionsTabProps {
  isUserBorrower: boolean;
  isUserLender: boolean;
  processingAction: string | null;
  loanStatus: number | string;
  handleSimulateDefault: () => Promise<void>;
  handleWithdrawCollateral: () => Promise<void>;
  handlePayRentUsingLoan: () => Promise<void>;
}

const TestFunctionsTab: React.FC<TestFunctionsTabProps> = ({
  isUserBorrower,
  isUserLender,
  processingAction,
  loanStatus,
  handleSimulateDefault,
  handleWithdrawCollateral,
  handlePayRentUsingLoan
}) => {
  // Convert loanStatus to number if it's a string number
  const getNumericStatus = (): number => {
    if (typeof loanStatus === 'number') return loanStatus;
    if (typeof loanStatus === 'string') {
      // Check if it's a numeric string
      if (!isNaN(Number(loanStatus))) return Number(loanStatus);
      
      // Map string status to enum values
      switch (loanStatus) {
        case 'INITIALIZED':
        case 'CREATED': return LoanAgreementStatus.INITIALIZED;
        case 'READY': return LoanAgreementStatus.READY;
        case 'ACTIVE': return LoanAgreementStatus.ACTIVE;
        case 'PAID': return LoanAgreementStatus.PAID;
        case 'COMPLETED': return LoanAgreementStatus.COMPLETED;
        case 'DEFAULTED': return LoanAgreementStatus.DEFAULTED;
        default: return -1; // Invalid status
      }
    }
    return -1; // Default to invalid status
  };

  // Get the numeric status
  const status = getNumericStatus();
  
  // Debug log 
  console.log('TestFunctionsTab - Original status:', loanStatus, 'Numeric status:', status, 
              'isUserBorrower:', isUserBorrower, 'isUserLender:', isUserLender,
              'Expected INITIALIZED enum value:', LoanAgreementStatus.INITIALIZED,
              'Expected READY enum value:', LoanAgreementStatus.READY,
              'Expected PAID enum value:', LoanAgreementStatus.PAID);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldAlert className="h-5 w-5 mr-2" /> Loan Operations
        </CardTitle>
        <CardDescription>
          Manage your loan agreement operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="mb-4" variant="default">
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              These operations will interact with your blockchain contracts and may require transaction fees.
              {status === -1 && <div className="mt-2 font-semibold text-red-600">Warning: Unable to determine loan status</div>}
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Withdraw Collateral Button - Only for borrower when loan is INITIALIZED */}
            {isUserBorrower && status === LoanAgreementStatus.INITIALIZED && (
              <Button 
                variant="secondary"
                disabled={processingAction !== null}
                onClick={handleWithdrawCollateral}
              >
                {processingAction === 'withdrawCollateral' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Withdraw Collateral From Rental Contract
                  </>
                )}
              </Button>
            )}
            
            {/* Pay Rent Using Loan Button - Only for borrower when loan is READY */}
            {isUserBorrower && status === LoanAgreementStatus.READY && (
              <Button 
                variant="secondary"
                disabled={processingAction !== null}
                onClick={handlePayRentUsingLoan}
              >
                {processingAction === 'payRentUsingLoan' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Coins className="mr-2 h-4 w-4" />
                    Pay Rent Using Loan
                  </>
                )}
              </Button>
            )}
            
            {/* Simulate Default Button - Only for borrower when loan is PAID */}
            {isUserBorrower && status === LoanAgreementStatus.PAID && (
              <Button 
                variant="destructive"
                disabled={processingAction !== null}
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
                    Default Loan
                  </>
                )}
              </Button>
            )}
            
            {/* No operations available message */}
            {!((isUserBorrower && (
                status === LoanAgreementStatus.INITIALIZED || 
                status === LoanAgreementStatus.READY || 
                status === LoanAgreementStatus.PAID
              ))) && (
              <Alert>
                <AlertDescription>
                  No operations available for current loan status: {typeof loanStatus === 'string' ? loanStatus : LoanAgreementStatus[loanStatus as number] || 'Unknown'} (Status ID: {status})
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestFunctionsTab; 