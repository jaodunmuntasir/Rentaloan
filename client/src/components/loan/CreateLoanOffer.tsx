import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { InfoIcon, BadgePercent, Clock, CreditCard, Calculator, Loader2, DollarSign } from 'lucide-react';
import { Input } from '../ui/input';

interface CreateLoanOfferProps {
  requestData: {
    amount: string;
    interestRate?: number;
    duration: number;
  };
  possibleLoanDuration: number;
  isSubmitting?: boolean;
  onSubmit?: (interestRate: number, duration: number, amount: string) => Promise<void>;
}

const CreateLoanOffer: React.FC<CreateLoanOfferProps> = ({
  requestData,
  possibleLoanDuration,
  isSubmitting = false,
  onSubmit
}) => {
  // State
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [interestRate, setInterestRate] = useState(Math.round(requestData.interestRate || 5));
  
  // Use the fixed duration and amount from the loan request
  const duration = requestData.duration;
  const offerAmount = requestData.amount;
  
  // Calculated values
  const monthlyPayment = calculateMonthlyPayment(offerAmount, interestRate, duration);
  const totalRepayment = calculateTotalRepayment(monthlyPayment, duration);
  const totalInterest = calculateTotalInterest(offerAmount, totalRepayment);
  const apr = calculateAPR(interestRate);
  
  // Calculate monthly payment
  function calculateMonthlyPayment(amount: string, interestRate: number, duration: number): string {
    const principal = parseFloat(amount);
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = duration;
    
    if (principal <= 0 || interestRate <= 0 || numberOfPayments <= 0) {
      return '0';
    }
    
    // Monthly payment formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const payment = 
      principal * 
      monthlyInterestRate * 
      Math.pow(1 + monthlyInterestRate, numberOfPayments) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    return payment.toFixed(6);
  }
  
  // Calculate total repayment
  function calculateTotalRepayment(monthlyPayment: string, duration: number): string {
    const payment = parseFloat(monthlyPayment);
    return (payment * duration).toFixed(6);
  }
  
  // Calculate total interest
  function calculateTotalInterest(loanAmount: string, totalRepayment: string): string {
    const principal = parseFloat(loanAmount);
    const repayment = parseFloat(totalRepayment);
    return (repayment - principal).toFixed(6);
  }
  
  // Calculate APR (Annual Percentage Rate)
  function calculateAPR(interestRate: number): string {
    // In this simplified model, APR equals the nominal interest rate
    return interestRate.toFixed(2);
  }
  
  // Handle interest rate slider change
  const handleInterestRateChange = (value: number[]) => {
    setInterestRate(value[0]);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setError(null);
    
    try {
      // If onSubmit callback is provided, call it
      if (onSubmit) {
        // Always use the requested amount
        await onSubmit(interestRate, duration, requestData.amount);
      }
    } catch (err) {
      console.error("Error creating loan offer:", err);
      setError('Failed to create loan offer. Please try again.');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" /> Create a Loan Offer
        </CardTitle>
        <CardDescription>
          Offer to lend ETH to this borrower with your terms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Amount (Read-only) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="offer-amount" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> Loan Amount
                </Label>
                <span className="font-medium text-lg">{offerAmount} ETH</span>
              </div>
              <Input
                id="offer-amount"
                type="text"
                value={offerAmount}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground">
                <InfoIcon className="h-3 w-3 inline mr-1" /> 
                The loan amount is fixed to the requested amount
              </p>
            </div>
            
            {/* Interest Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="interest-rate" className="flex items-center gap-1">
                  <BadgePercent className="h-4 w-4" /> Interest Rate
                </Label>
                <span className="font-medium text-lg">{interestRate}%</span>
              </div>
              <Slider
                id="interest-rate"
                defaultValue={[interestRate]}
                min={1}
                max={20}
                step={1}
                onValueChange={handleInterestRateChange}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span>20%</span>
              </div>
              {requestData.interestRate && (
                <p className="text-sm text-muted-foreground mt-1">
                  <InfoIcon className="h-3 w-3 inline mr-1" /> Borrower prefers {requestData.interestRate}%
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                <InfoIcon className="h-3 w-3 inline mr-1" /> Interest rate must be a whole number for compatibility with the blockchain
              </p>
            </div>
          </div>
          
          {/* Loan Duration (Fixed) */}
          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Loan Duration
              </Label>
              <span className="font-medium">{duration} months</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <InfoIcon className="h-3 w-3 inline mr-1" /> 
              The loan duration is fixed and determined by the rental agreement (maximum: {possibleLoanDuration} months)
            </p>
          </div>
          
          {/* Loan Payment Calculator */}
          <div className="pt-4">
            <div className="flex items-center mb-4">
              <Calculator className="h-5 w-5 mr-2 text-muted-foreground" />
              <h3 className="font-medium">Loan Payment Calculator</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md bg-muted p-3">
                <Label className="text-xs text-muted-foreground">Monthly Payment</Label>
                <p className="font-medium">{monthlyPayment} ETH</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <Label className="text-xs text-muted-foreground">Total Repayment</Label>
                <p className="font-medium">{totalRepayment} ETH</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <Label className="text-xs text-muted-foreground">Total Interest</Label>
                <p className="font-medium">{totalInterest} ETH</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <Label className="text-xs text-muted-foreground">APR</Label>
                <p className="font-medium">{apr}%</p>
              </div>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Submit Loan Offer</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateLoanOffer; 