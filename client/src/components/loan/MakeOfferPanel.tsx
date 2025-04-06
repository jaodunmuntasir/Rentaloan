import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { Button } from '../ui/button';
import { DollarSign, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import CreateLoanOffer from './CreateLoanOffer';

interface LoanOffer {
  id: string;
  interestRate: number;
  duration: number;
  amount?: string;
  status: string;
}

interface MakeOfferPanelProps {
  userHasOffer: boolean;
  loanRequestStatus: string;
  userOffer: LoanOffer | null;
  loanRequestAmount: string;
  loanRequestInterestRate: number;
  loanRequestDuration: number;
  possibleLoanDuration: number;
  processingAction: string | null;
  handleWithdrawOffer: (offerId: string) => void;
  handleOfferSubmit: (interestRate: number, duration: number, amount: string) => Promise<void>;
  getStatusBadge: (status: string) => React.ReactNode;
}

const MakeOfferPanel: React.FC<MakeOfferPanelProps> = ({
  userHasOffer,
  loanRequestStatus,
  userOffer,
  loanRequestAmount,
  loanRequestInterestRate,
  loanRequestDuration,
  possibleLoanDuration,
  processingAction,
  handleWithdrawOffer,
  handleOfferSubmit,
  getStatusBadge
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" /> Make a Loan Offer
        </CardTitle>
        <CardDescription>
          Provide an interest rate for your loan offer. The loan amount and duration are fixed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userHasOffer ? (
          <div className="space-y-4">
            <Alert>
              <AlertTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                You have already made an offer
              </AlertTitle>
              <AlertDescription>
                You have already submitted an offer for this loan
                request. You cannot edit your offer, but you can
                withdraw it if it hasn't been accepted yet.
              </AlertDescription>
            </Alert>

            {userOffer && (
              <Card className="border border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your Offer</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Interest Rate
                      </p>
                      <p className="font-medium">
                        {userOffer.interestRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Duration
                      </p>
                      <p className="font-medium">
                        {userOffer.duration || loanRequestDuration} months
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Loan Amount
                      </p>
                      <p className="font-medium">
                        {userOffer.amount || loanRequestAmount} ETH
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Status
                      </p>
                      <p className="font-medium">
                        {getStatusBadge(userOffer.status || "")}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  {userOffer.status === "PENDING" && (
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleWithdrawOffer(userOffer.id || "")
                      }
                      disabled={processingAction !== null}
                    >
                      {processingAction ===
                      `withdrawing-${userOffer.id}` ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Withdraw Offer
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}
          </div>
        ) : loanRequestStatus !== "OPEN" ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This loan request is no longer open</AlertTitle>
            <AlertDescription>
              You cannot make an offer for this loan request as it has
              already been fulfilled or closed.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mt-8">
            <CreateLoanOffer 
              requestData={{
                amount: loanRequestAmount,
                interestRate: loanRequestInterestRate,
                duration: loanRequestDuration
              }}
              possibleLoanDuration={possibleLoanDuration}
              isSubmitting={processingAction === 'submitting-offer'}
              onSubmit={handleOfferSubmit}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MakeOfferPanel; 