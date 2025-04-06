import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { LoanApi } from '../../services/api.service';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { 
  Loader2, 
  ArrowLeft, 
  DollarSign, 
  Calendar,  
  Percent,
} from 'lucide-react';

const RequestCreate: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { details, loading, error: rentalError } = useRentalAgreement(address || '');
  
  // State
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [loanAmount, setLoanAmount] = useState('0.1');
  const [loanDuration, setLoanDuration] = useState(3);
  const [interestRate, setInterestRate] = useState(5);
  
  // Update default loan amount when details are loaded
  useEffect(() => {
    if (details && details.dueAmount) {
      // Set to the max loan amount which includes due amount plus current rent
      const maxAmount = calculateMaxLoanAmount();
      setLoanAmount(maxAmount);
    }
  }, [details]);
  
  // Calculate maximum loan amount based on the dueAmount plus current month's rent
  const calculateMaxLoanAmount = (): string => {
    if (!details || (!details.dueAmount && !details.rentAmount)) return '0';
    
    // Add the due amount and the current month's base rent
    const dueAmount = parseFloat(details.dueAmount || '0');
    const baseRent = parseFloat(details.rentAmount || '0');
    const maxAmount = dueAmount + baseRent;
    
    return maxAmount.toString();
  };
  
  // Calculate remaining rental duration minus 1 (can't loan for the entire remaining period)
  const calculateRemainingDuration = (): number => {
    if (!details || !details.rentDuration || details.lastPaidMonth === undefined) return 0;
    
    // Remaining duration is total duration minus last paid month minus 1
    const remainingMonths = Math.max(0, details.rentDuration - details.lastPaidMonth - 1);
    
    return remainingMonths;
  };
  
  // Check if the security deposit is sufficient for the requested loan amount
  const isSecurityDepositSufficient = (): boolean => {
    if (!details || !details.currentSecurityDeposit) return false;
    
    const currentSecurityDeposit = parseFloat(details.currentSecurityDeposit);
    const maxLoanAmount = parseFloat(calculateMaxLoanAmount());
    
    return currentSecurityDeposit >= maxLoanAmount;
  };

  
  // Check if form is valid
  const isFormValid = (): boolean => {
    const maxLoanAmount = parseFloat(calculateMaxLoanAmount());
    const requestedAmount = parseFloat(loanAmount);
    const remainingDuration = calculateRemainingDuration();
    
    // Add security deposit validation to the form validation checks
    return (
      address !== undefined &&
      requestedAmount > 0 &&
      requestedAmount <= maxLoanAmount &&
      loanDuration >= 1 && 
      loanDuration <= remainingDuration &&
      interestRate >= 1 &&
      isSecurityDepositSufficient() &&
      remainingDuration > 0 // Can't create loan if remaining duration is 0
    );
  };
  
  // Handle loan duration slider change
  const handleLoanDurationChange = (value: number[]) => {
    setLoanDuration(value[0]);
  };
  
  // Handle interest rate change
  const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 1)) {
      setInterestRate(parseFloat(value) || 1);
    }
  };
  
  // Handle loan amount change
  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLoanAmount(value);
    }
  };
  
  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Handle submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Please correct the form errors before submitting.');
      return;
    }
    
    setCreatingRequest(true);
    setError(null);
    
    try {
      if (!address || !currentUser) {
        throw new Error('Missing required data');
      }
      
      // Convert Firebase User to App User
      const appUser = {
        id: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || '',
        walletAddress: null,
        token: await currentUser.getIdToken()
      };
      
      console.log('Submitting loan request with:', {
        address,
        loanAmount,
        loanDuration,
        interestRate
      });
      
      // Create the explicit request payload for better debugging
      const requestPayload = {
        rentalAgreementAddress: address,
        requestedAmount: loanAmount,
        duration: parseInt(loanDuration.toString()), // ensure it's a number
        interestRate: parseFloat(interestRate.toString()) // ensure it's a number
      };
      
      console.log('Final request payload:', requestPayload);
      
      // Create loan request via API
      const response = await LoanApi.createLoanRequest(appUser, requestPayload);
      
      console.log('API response:', response);
      
      if (response && response.loanRequest) {
        // Redirect to the my loan requests list
        navigate('/loan/myrequests');
      } else {
        setError('Failed to create loan request. Please try again.');
      }
    } catch (err) {
      console.error("Error creating loan request:", err);
      setError('Failed to create loan request. Please try again.');
    } finally {
      setCreatingRequest(false);
    }
  };
  
  if (!address) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>No rental agreement address provided</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <a href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-2">Loading rental agreement details...</span>
      </div>
    );
  }
  
  if (rentalError || !details) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load rental agreement details</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{rentalError || "Could not load rental details"}</AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <a href={`/rental/${address}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Rental Agreement
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const maxLoanAmount = calculateMaxLoanAmount();
  const remainingDuration = calculateRemainingDuration();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/rental/${address}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Rental Details
        </Button>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Loan Request</h1>
        <p className="text-muted-foreground mt-2">
          Request a loan using your rental agreement security deposit as collateral
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rental Agreement Details</CardTitle>
            <CardDescription>Information about your rental agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Contract Address</Label>
                <p className="text-sm font-medium mt-1">{formatAddress(address || '')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Monthly Rent</Label>
                <p className="text-sm font-medium mt-1">{details?.rentAmount} ETH</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Current Due Amount</Label>
                <p className="text-sm font-medium mt-1">{loanAmount} ETH</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Security Deposit</Label>
                <p className="text-sm font-medium mt-1">{details?.currentSecurityDeposit} ETH</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Possible Loan Duration</Label>
                <p className="text-sm font-medium mt-1">{calculateRemainingDuration()} months</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Max Loan Amount</Label>
                <p className="text-sm font-medium mt-1">{calculateMaxLoanAmount()} ETH</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Possible Collateral</Label>
                <p className="text-sm font-medium mt-1">{calculateMaxLoanAmount()} ETH</p>
              </div>
            </div>
            
            {/* Show warning if security deposit is insufficient */}
            {!isSecurityDepositSufficient() && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Insufficient Security Deposit</AlertTitle>
                <AlertDescription>
                  Your current security deposit is less than the maximum loan amount. 
                  You can only request a loan up to your current security deposit amount.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Show warning if no remaining duration for loan */}
            {calculateRemainingDuration() <= 0 && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>No Available Duration</AlertTitle>
                <AlertDescription>
                  You cannot take a loan because there's not enough remaining time on your rental agreement.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Loan Request</CardTitle>
              <CardDescription>Enter your loan request details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Loan Amount */}
              <div className="space-y-2">
                <Label htmlFor="loan-amount" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> Loan Amount (ETH)
                </Label>
                <Input
                  id="loan-amount"
                  type="text"
                  value={loanAmount}
                  onChange={handleLoanAmountChange}
                  className={parseFloat(loanAmount) > parseFloat(maxLoanAmount) ? "border-red-500" : ""}
                />
                {parseFloat(loanAmount) > parseFloat(maxLoanAmount) && (
                  <p className="text-xs text-red-500">
                    Amount cannot exceed the maximum loan amount ({maxLoanAmount} ETH)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum loan amount is equal to your current due amount.
                </p>
              </div>
              
              {/* Loan Duration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="loan-duration" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Loan Duration
                  </Label>
                  <span className="font-medium">{remainingDuration} months</span>
                </div>
                <Slider
                  id="loan-duration"
                  defaultValue={[loanDuration]}
                  min={1}
                  max={remainingDuration}
                  step={1}
                  onValueChange={handleLoanDurationChange}
                  className="my-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 month</span>
                  <span>{remainingDuration} months</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Loan duration cannot exceed the remaining rental period ({remainingDuration} months).
                </p>
              </div>
              
              {/* Preferred Interest Rate */}
              <div className="space-y-2">
                <Label htmlFor="interest-rate" className="flex items-center gap-1">
                  <Percent className="h-4 w-4" /> Preferred Interest Rate (%)
                </Label>
                <Input
                  id="interest-rate"
                  type="text"
                  value={interestRate.toString()}
                  onChange={handleInterestRateChange}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum interest rate is 1%. Lenders may offer different rates.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={!isFormValid() || creatingRequest}>
                {creatingRequest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Request...
                  </>
                ) : (
                  "Create Loan Request"
                )}
              </Button>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default RequestCreate; 