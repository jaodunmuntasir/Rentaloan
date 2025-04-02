import React, { useState } from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { CalendarDays, Loader2, Check, AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';

interface PayRentProps {
  contractAddress: string;
  onSuccess?: () => void;
}

const PayRent: React.FC<PayRentProps> = ({
  contractAddress,
  onSuccess
}) => {
  const { details, loading, error, payRent } = useRentalAgreement(contractAddress);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Handle rent payment
  const handlePayRent = async () => {
    if (!contractAddress) return;
    
    try {
      setIsProcessing(true);
      const receipt = await payRent();
      
      if (receipt && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error paying rent:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Calculate days until rent is due
  const getDaysUntilDue = () => {
    if (!details) return 0;
    const now = new Date();
    const dueDate = details.nextPaymentDate;
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Determine payment status and display
  const getPaymentStatus = () => {
    if (!details) return { status: 'unknown', message: 'Unknown status' };
    
    if (details.currentRentPaid) {
      return { 
        status: 'paid', 
        message: `Rent paid until ${details.nextPaymentDate.toLocaleDateString()}` 
      };
    }
    
    const daysUntilDue = getDaysUntilDue();
    if (daysUntilDue < 0) {
      return { 
        status: 'overdue', 
        message: `Rent overdue by ${Math.abs(daysUntilDue)} days` 
      };
    } else if (daysUntilDue <= 3) {
      return { 
        status: 'due-soon', 
        message: `Rent due in ${daysUntilDue} days` 
      };
    } else {
      return { 
        status: 'upcoming', 
        message: `Next payment in ${daysUntilDue} days` 
      };
    }
  };
  
  // If loading details
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rent Payment</CardTitle>
          <CardDescription>Loading rental details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // If error or no details
  if (error || !details) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rent Payment</CardTitle>
          <CardDescription className="text-destructive">
            {error || "Failed to load rental details"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // If security deposit not paid yet
  if (!details.securityDepositPaid) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rent Payment</CardTitle>
          <CardDescription>Security deposit required before paying rent</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-600">Security Deposit Required</AlertTitle>
            <AlertDescription>
              You need to pay the security deposit before you can make rent payments.
              Please complete the security deposit payment first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  const paymentStatus = getPaymentStatus();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          Rent Payment
          {paymentStatus.status === 'paid' && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
              <Check className="h-3 w-3 mr-1" /> Paid
            </Badge>
          )}
          {paymentStatus.status === 'overdue' && (
            <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
            </Badge>
          )}
          {paymentStatus.status === 'due-soon' && (
            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200">
              <Clock className="h-3 w-3 mr-1" /> Due Soon
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {paymentStatus.message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center p-4 rounded-lg bg-muted">
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="text-2xl font-bold">{details.rentAmount} ETH</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="text-2xl font-bold">{details.nextPaymentDate.toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Rent Period</p>
              <p className="text-xl font-medium">{details.rentDuration} months</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Payment Cycle</p>
              <p className="text-xl font-medium">Every {details.paymentInterval} month(s)</p>
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex items-center mb-2">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <h3 className="text-sm font-medium">Payment Timeline</h3>
          </div>
          <div className="rounded-md overflow-hidden border">
            <div className="bg-primary/10 px-4 py-2 border-b">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Rental Progress</span>
                <span className="text-xs">
                  {Math.round((Number(details.currentRentPaid) / Number(details.rentDuration)) * 100)}%
                </span>
              </div>
            </div>
            <div className="p-4">
              <Progress
                value={(Number(details.currentRentPaid) / Number(details.rentDuration)) * 100}
                className="h-2 mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start</span>
                <span>Current</span>
                <span>End</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">Payment Details</h3>
          <Separator />
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Base Rent</span>
            <span>{details.rentAmount} ETH</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Payment Processing Fee</span>
            <span>0.00 ETH</span>
          </div>
          <Separator />
          <div className="flex justify-between py-1 font-medium">
            <span>Total Due</span>
            <span>{details.rentAmount} ETH</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={isProcessing || details.currentRentPaid}
          onClick={handlePayRent}
          variant={details.currentRentPaid ? "outline" : "default"}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : details.currentRentPaid ? (
            "Rent Already Paid for Current Period"
          ) : (
            `Pay Rent (${details.rentAmount} ETH)`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PayRent; 