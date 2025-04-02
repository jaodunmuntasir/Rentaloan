import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { 
  Wallet, 
  ArrowRight, 
  Check, 
  Clock, 
  Calendar, 
  CreditCard, 
  Loader2,
  AlertTriangle,
  InfoIcon
} from 'lucide-react';

interface PayLoanProps {
  loanAddress: string;
  onSuccess?: () => void;
}

interface LoanDetails {
  id: string;
  loanAmount: string;
  interestRate: number;
  loanDuration: number;
  installmentAmount: string;
  currentPaidAmount: string;
  nextPaymentDue: Date;
  totalRemainingAmount: string;
  remainingInstallments: number;
  status: 'active' | 'paid' | 'defaulted';
  earlyRepaymentAllowed: boolean;
}

const PayLoan: React.FC<PayLoanProps> = ({ loanAddress, onSuccess }) => {
  const { currentUser } = useAuth();
  const { loanFactory } = useContracts();
  
  // State
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  
  // Pay full remaining amount
  const [payInFull, setPayInFull] = useState(false);
  
  // Load loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      if (!loanAddress) {
        setError('Loan address is required');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // In a real app, this would fetch from the blockchain
        // Mock data for demo purposes
        const mockLoanDetails: LoanDetails = {
          id: loanAddress,
          loanAmount: '2.5',
          interestRate: 5.5,
          loanDuration: 12,
          installmentAmount: '0.2157',
          currentPaidAmount: '0.6471',
          nextPaymentDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          totalRemainingAmount: '1.9413',
          remainingInstallments: 9,
          status: 'active',
          earlyRepaymentAllowed: true
        };
        
        setLoanDetails(mockLoanDetails);
      } catch (err) {
        console.error("Error fetching loan details:", err);
        setError('Failed to load loan details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoanDetails();
  }, [loanAddress]);
  
  // Calculate repayment progress percentage
  const calculateProgress = (): number => {
    if (!loanDetails) return 0;
    
    const paidAmount = parseFloat(loanDetails.currentPaidAmount);
    const totalAmount = parseFloat(loanDetails.loanAmount) * (1 + (loanDetails.interestRate / 100));
    
    return Math.min(100, Math.round((paidAmount / totalAmount) * 100));
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate days until next payment
  const calculateDaysUntilPayment = (): number => {
    if (!loanDetails?.nextPaymentDue) return 0;
    
    const now = new Date();
    const diffTime = loanDetails.nextPaymentDue.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  // Handle payment
  const handlePayment = async () => {
    if (!loanDetails) return;
    
    setProcessing(true);
    setError(null);
    setSuccess(false);
    
    try {
      // In a real app, this would call a blockchain transaction
      console.log('Processing payment for loan:', {
        loanAddress,
        amount: payInFull ? loanDetails.totalRemainingAmount : loanDetails.installmentAmount
      });
      
      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update loan details
      if (payInFull) {
        setLoanDetails({
          ...loanDetails,
          currentPaidAmount: (parseFloat(loanDetails.loanAmount) * (1 + loanDetails.interestRate / 100)).toString(),
          totalRemainingAmount: '0',
          remainingInstallments: 0,
          status: 'paid'
        });
      } else {
        const newPaidAmount = (parseFloat(loanDetails.currentPaidAmount) + parseFloat(loanDetails.installmentAmount)).toString();
        const newRemainingAmount = (parseFloat(loanDetails.totalRemainingAmount) - parseFloat(loanDetails.installmentAmount)).toString();
        const newRemainingInstallments = loanDetails.remainingInstallments - 1;
        
        setLoanDetails({
          ...loanDetails,
          currentPaidAmount: newPaidAmount,
          totalRemainingAmount: newRemainingAmount,
          remainingInstallments: newRemainingInstallments,
          nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
          status: newRemainingInstallments === 0 ? 'paid' : 'active'
        });
      }
      
      setSuccess(true);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error processing payment:", err);
      setError('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error && !loanDetails) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!loanDetails) {
    return (
      <Alert>
        <AlertTitle>No loan details available</AlertTitle>
        <AlertDescription>Could not retrieve loan information.</AlertDescription>
      </Alert>
    );
  }
  
  // Loan is fully paid
  if (loanDetails.status === 'paid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Check className="h-5 w-5 mr-2 text-green-500" /> Loan Fully Repaid
          </CardTitle>
          <CardDescription>
            This loan has been completely repaid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <div className="flex flex-col items-center text-center">
              <Check className="h-12 w-12 text-green-500 mb-2" />
              <h3 className="text-lg font-semibold text-green-700">Loan Successfully Repaid</h3>
              <p className="text-green-600 mt-1">
                Congratulations! You have fully repaid this loan.
              </p>
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Amount:</span>
                <span className="font-medium">{loanDetails.loanAmount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate:</span>
                <span className="font-medium">{loanDetails.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Term:</span>
                <span className="font-medium">{loanDetails.loanDuration} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-medium">{loanDetails.currentPaidAmount} ETH</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" /> Loan Repayment
        </CardTitle>
        <CardDescription>
          Make your loan payment on time to maintain good standing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Loan Progress</span>
            <span className="font-medium">{calculateProgress()}% Repaid</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center mb-3">
              <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
              <h3 className="font-medium">Loan Details</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Amount:</span>
                <span className="font-medium">{loanDetails.loanAmount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate:</span>
                <span className="font-medium">{loanDetails.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Term:</span>
                <span className="font-medium">{loanDetails.loanDuration} months</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Paid:</span>
                <span className="font-medium">{loanDetails.currentPaidAmount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-medium">{loanDetails.totalRemainingAmount} ETH</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center mb-3">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <h3 className="font-medium">Payment Schedule</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Installment Amount:</span>
                <span className="font-medium">{loanDetails.installmentAmount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Payments:</span>
                <span className="font-medium">{loanDetails.remainingInstallments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Due Date:</span>
                <span className="font-medium">{formatDate(loanDetails.nextPaymentDue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Remaining:</span>
                <span className={`font-medium ${calculateDaysUntilPayment() < 3 ? 'text-amber-500' : ''}`}>
                  {calculateDaysUntilPayment()} days
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="pay-in-full" className="cursor-pointer">Pay loan in full</Label>
              <span title="Pay off your entire remaining balance at once">
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </span>
            </div>
            <Switch
              id="pay-in-full"
              checked={payInFull}
              onCheckedChange={setPayInFull}
              disabled={!loanDetails.earlyRepaymentAllowed}
            />
          </div>
          
          {!loanDetails.earlyRepaymentAllowed && (
            <p className="text-xs text-muted-foreground">
              Early repayment is not allowed for this loan.
            </p>
          )}
          
          <Card className="border border-primary/20">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Amount:</span>
                  <span className="text-xl font-bold">
                    {payInFull ? loanDetails.totalRemainingAmount : loanDetails.installmentAmount} ETH
                  </span>
                </div>
                
                {payInFull && (
                  <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Paying Full Amount</AlertTitle>
                    <AlertDescription>
                      You're paying off the entire remaining balance of {loanDetails.totalRemainingAmount} ETH.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-center">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="w-full"
                    disabled={processing}
                    onClick={handlePayment}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Processing...
                      </>
                    ) : (
                      <>
                        Make Payment <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment will be processed immediately on confirmation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Payment Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4" />
              <AlertTitle>Payment Successful</AlertTitle>
              <AlertDescription>
                Your payment of {payInFull ? loanDetails.totalRemainingAmount : loanDetails.installmentAmount} ETH has been processed successfully.
                {(loanDetails.status as string) === 'paid' && ' This loan is now fully repaid!'}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center mb-3">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <h3 className="font-medium">Payment History</h3>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <div className="flex justify-between py-1">
                <span>30 days ago</span>
                <span className="font-medium">{loanDetails.installmentAmount} ETH</span>
              </div>
              <div className="flex justify-between py-1">
                <span>60 days ago</span>
                <span className="font-medium">{loanDetails.installmentAmount} ETH</span>
              </div>
              <div className="flex justify-between py-1">
                <span>90 days ago</span>
                <span className="font-medium">{loanDetails.installmentAmount} ETH</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayLoan; 