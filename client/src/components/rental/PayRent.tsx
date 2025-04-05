import React, { useState, useEffect } from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { CalendarDays, Loader2, Check, AlertTriangle, Clock, ArrowRightLeft } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

// Extend the RentalAgreementDetails interface
interface ExtendedRentalAgreementDetails {
  landlord: string;
  tenant: string;
  propertyAddress: string;
  propertyNftId: string;
  rentAmount: string;
  securityDeposit: string;
  rentDuration: number;
  paymentInterval: number;
  nextPaymentDate: Date;
  isActive: boolean;
  securityDepositPaid: boolean;
  currentRentPaid: boolean;
  currentMonth?: number;
  lastPaidMonth?: number;
  gracePeriod: number;
  currentSecurityDeposit: string;
  name?: string;
  userRole?: string;
  landlordDetails?: any;
  renterDetails?: any;
  dueAmount: string;
  skippedMonths?: number;
}

interface PayRentProps {
  contractAddress: string;
  onSuccess?: () => void;
  showSkipOption?: boolean;
  loanContractAddress?: string;
}

const PayRent: React.FC<PayRentProps> = ({
  contractAddress,
  onSuccess,
  showSkipOption = false,
  loanContractAddress
}) => {
  const { details, loading, error, payRent, skipRent } = useRentalAgreement(contractAddress);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSkipping, setIsSkipping] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  
  // Update available months and selected month when details change
  useEffect(() => {
    if (details) {
      const lastPaid = details.lastPaidMonth ?? 0;
      const duration = details.rentDuration;
      
      // Generate array of months that can be paid
      // For testing, allow all months up to rental duration
      const months = Array.from(
        { length: duration }, 
        (_, i) => i + 1
      ).filter(month => month <= duration);
      
      setAvailableMonths(months);
      
      // Default to next month after last paid
      setSelectedMonth(lastPaid + 1);
    }
  }, [details]);
  
  // Handle rent payment
  const handlePayRent = async () => {
    if (!contractAddress || !details) return;
    
    try {
      setIsProcessing(true);
      
      console.log(`Paying rent for month ${selectedMonth}`);
      const receipt = await payRent(selectedMonth);
      
      if (receipt && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error paying rent:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle skip rent
  const handleSkipRent = async () => {
    if (!contractAddress || !details) return;
    
    try {
      setIsSkipping(true);
      
      console.log(`Skipping rent for month ${selectedMonth}`);
      const receipt = await skipRent(selectedMonth);
      
      if (receipt && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error skipping rent:", err);
    } finally {
      setIsSkipping(false);
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
  const typedDetails = details as ExtendedRentalAgreementDetails;
  const totalDueAmount = parseFloat(typedDetails.rentAmount) + 
    (typedDetails.dueAmount ? parseFloat(typedDetails.dueAmount) : 0);
  
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
              <p className="text-xl font-medium">Monthly</p>
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
                  {Math.round((Number(details.lastPaidMonth) / Number(details.rentDuration)) * 100)}%
                </span>
              </div>
            </div>
            <div className="p-4">
              <Progress
                value={(Number(details.lastPaidMonth) / Number(details.rentDuration)) * 100}
                className="h-2 mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start</span>
                <span></span>
                <span>End</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Month selection for testing */}
        <div className="space-y-2">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="month-select">Select Month (For Testing)</Label>
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Select month to pay" />
              </SelectTrigger>
              <SelectContent position="popper">
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month.toString()}>
                    Month {month} {month === (details.lastPaidMonth ?? 0) + 1 ? '(Next Due)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            <Alert className="bg-muted/50">
              <AlertDescription>
                For testing purposes, you can select any month to pay or skip. 
                In production, this would be limited to the next unpaid month.
              </AlertDescription>
            </Alert>
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
            <span className="text-muted-foreground">Due Amount (from skipped payments)</span>
            <span>{typedDetails.dueAmount ? typedDetails.dueAmount : "0.00"} ETH</span>
          </div>
          <Separator />
          <div className="flex justify-between py-1 font-medium">
            <span>Total Due</span>
            <span>{totalDueAmount.toFixed(5)} ETH</span>
          </div>
        </div>
        
        {showSkipOption && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              <p>You can <strong>skip a rent payment</strong> if you're unable to pay now. 
              The skipped amount will be added to your next payment's due amount.</p>
              
              <p className="mt-2">This is different from requesting a loan. Skipping rent simply 
              defers the payment to the next month without involving a lender.</p>
              
              <div className="mt-2">
                <strong>Grace Period:</strong> {details.gracePeriod} months
              </div>
              {typedDetails.skippedMonths !== undefined && (
                <div>
                  <strong>Skipped Months:</strong> {typedDetails.skippedMonths}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {parseFloat(typedDetails.dueAmount) > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center w-full gap-4">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <AlertTitle className="text-blue-600">Need help with your rent payment?</AlertTitle>
                  <AlertDescription>
                    You can request a loan for your rent payment using your security deposit as collateral.
                  </AlertDescription>
                </div>
              </div>
              <Button variant="outline" className="border-blue-300 hover:bg-blue-100 text-blue-600" asChild>
                <a href={`/rental/${contractAddress}/loan/request/create`}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Request a Loan
                </a>
              </Button>
            </div>
          </Alert>
        )}
      </CardContent>
      <CardFooter className={showSkipOption ? "flex flex-col space-y-2" : ""}>
        <Button
          className="w-full"
          disabled={isProcessing}
          onClick={handlePayRent}
          variant="default"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay Rent for Month ${selectedMonth} (${totalDueAmount.toFixed(5)} ETH)`
          )}
        </Button>
        
        {showSkipOption && (
          <Button
            className="w-full"
            variant="outline"
            disabled={isSkipping || (typedDetails.skippedMonths !== undefined && typedDetails.skippedMonths >= details.gracePeriod)}
            onClick={handleSkipRent}
          >
            {isSkipping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Skip...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Skip Rent for Month {selectedMonth}
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PayRent; 