import React, { useState } from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { useLoanAgreement } from '../../hooks/useLoanAgreement';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { AlertTriangle, Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import { Progress } from '../ui/progress';

interface SkipRentProps {
  rentalContractAddress: string;
  loanContractAddress: string;
  onSuccess?: () => void;
}

const SkipRent: React.FC<SkipRentProps> = ({
  rentalContractAddress,
  loanContractAddress,
  onSuccess
}) => {
  const { details: rentalDetails, loading: rentalLoading, error: rentalError, skipRent } = useRentalAgreement(rentalContractAddress);
  const { details: loanDetails, loading: loanLoading, error: loanError } = useLoanAgreement(loanContractAddress);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Handle skip rent action
  const handleSkipRent = async () => {
    if (!rentalContractAddress || !rentalDetails) return;
    
    try {
      setIsProcessing(true);
      
      // Determine which month to skip based on lastPaidMonth
      // If lastPaidMonth is undefined, default to month 1
      const lastPaidMonth = rentalDetails.lastPaidMonth ?? 0;
      const monthToSkip = lastPaidMonth + 1;
      
      console.log(`Skipping rent for month ${monthToSkip}`);
      const receipt = await skipRent(monthToSkip);
      
      if (receipt && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error skipping rent:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Loading both contracts
  if (rentalLoading || loanLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Skip Rent Payment</CardTitle>
          <CardDescription>Loading details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Handle errors
  if (rentalError || loanError || !rentalDetails || !loanDetails) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Skip Rent Payment</CardTitle>
          <CardDescription className="text-destructive">
            {rentalError || loanError || "Failed to load contract details"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Check if loan is active and has sufficient allowance
  const canSkipRent = loanDetails.isActive && loanDetails.availableSkips > 0;
  
  // If security deposit not paid
  if (!rentalDetails.securityDepositPaid) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Skip Rent Payment</CardTitle>
          <CardDescription>Security deposit required before managing rent</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-600">Security Deposit Required</AlertTitle>
            <AlertDescription>
              You need to pay the security deposit before you can skip rent payments.
              Please complete the security deposit payment first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // If rent is already paid for the current period
  if (rentalDetails.currentRentPaid) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Skip Rent Payment</CardTitle>
          <CardDescription>Rent already paid for the current period</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Rent Already Paid</AlertTitle>
            <AlertDescription>
              The rent for the current period has already been paid.
              You'll be able to skip rent in a future period if needed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          Skip Rent Payment
          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-200">
            <CreditCard className="h-3 w-3 mr-1" /> Loan-backed
          </Badge>
        </CardTitle>
        <CardDescription>
          Use your loan to skip this month's rent payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Rent Amount</p>
              <p className="text-2xl font-bold">{rentalDetails.rentAmount} ETH</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Remaining Skip Credits</p>
              <p className="text-2xl font-bold">
                {loanDetails.availableSkips} / {loanDetails.totalSkips}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            Loan Skip Credits
          </h3>
          <div className="rounded-md overflow-hidden border">
            <div className="bg-primary/10 px-4 py-2 border-b">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Skip Credits Used</span>
                <span className="text-xs">
                  {Math.round(((loanDetails.totalSkips - loanDetails.availableSkips) / loanDetails.totalSkips) * 100)}%
                </span>
              </div>
            </div>
            <div className="p-4">
              <Progress
                value={((loanDetails.totalSkips - loanDetails.availableSkips) / loanDetails.totalSkips) * 100}
                className="h-2 mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>Used: {loanDetails.totalSkips - loanDetails.availableSkips}</span>
                <span>Total: {loanDetails.totalSkips}</span>
              </div>
            </div>
          </div>
        </div>
        
        {!canSkipRent && (
          <Alert className="bg-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Available</AlertTitle>
            <AlertDescription>
              {!loanDetails.isActive
                ? "Your loan agreement is not active. Please ensure your loan is properly initialized."
                : "You have no skip credits available. You must make the regular rent payment."}
            </AlertDescription>
          </Alert>
        )}
        
        {canSkipRent && (
          <Alert className="bg-primary">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Information</AlertTitle>
            <AlertDescription>
              Using a skip credit means:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Your loan will cover this month's rent payment</li>
                <li>You'll still need to repay this amount as part of your loan</li>
                <li>Once used, a skip credit cannot be refunded</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={isProcessing || !canSkipRent}
          onClick={handleSkipRent}
          variant={canSkipRent ? "default" : "outline"}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : !canSkipRent ? (
            !loanDetails.isActive
              ? "Loan Not Active"
              : "No Skip Credits Available"
          ) : (
            `Skip This Month's Rent (${rentalDetails.rentAmount} ETH)`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SkipRent; 