import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { 
  Loader2, 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  Shield, 
  Percent,
  Calculator,
  Home
} from 'lucide-react';

// Types for rental properties
interface RentalProperty {
  address: string;
  contractAddress: string;
  propertyAddress: string;
  rentAmount: string;
  rentDuration: number;
  isActive: boolean;
}

const RequestCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { loanFactory } = useContracts();
  
  // State
  const [loading, setLoading] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rentalProperties, setRentalProperties] = useState<RentalProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  
  // Form state
  const [loanAmount, setLoanAmount] = useState('1.0');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [loanDuration, setLoanDuration] = useState(12);
  const [interestRate, setInterestRate] = useState(5);
  const [graceMonths, setGraceMonths] = useState(1);
  
  // Load rental properties to use as collateral
  useEffect(() => {
    const fetchRentalProperties = async () => {
      try {
        setLoadingProperties(true);
        
        // In a real app, this would be fetched from the blockchain
        // For now, using mock data
        const mockProperties: RentalProperty[] = [
          {
            address: '0x1234567890123456789012345678901234567890',
            contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            propertyAddress: '123 Main St, New York, NY',
            rentAmount: '0.2',
            rentDuration: 12,
            isActive: true
          },
          {
            address: '0x2345678901234567890123456789012345678901',
            contractAddress: '0xbcdefabcdefabcdefabcdefabcdefabcdefabcde',
            propertyAddress: '456 Park Ave, Chicago, IL',
            rentAmount: '0.15',
            rentDuration: 24,
            isActive: true
          },
          {
            address: '0x3456789012345678901234567890123456789012',
            contractAddress: '0xcdefabcdefabcdefabcdefabcdefabcdefabcdef',
            propertyAddress: '789 Ocean Blvd, Miami, FL',
            rentAmount: '0.25',
            rentDuration: 6,
            isActive: true
          }
        ];
        
        setRentalProperties(mockProperties);
        
        // Auto-select first property if available
        if (mockProperties.length > 0) {
          setSelectedProperty(mockProperties[0].address);
        }
      } catch (err) {
        console.error("Error fetching rental properties:", err);
        setError('Failed to load your rental properties. Please try again.');
      } finally {
        setLoadingProperties(false);
      }
    };
    
    fetchRentalProperties();
  }, []);
  
  // Calculate maximum loan amount based on selected property
  const calculateMaxLoanAmount = (): string => {
    const property = rentalProperties.find(p => p.address === selectedProperty);
    if (!property) return '0';
    
    // In this simple model, max loan amount is rental amount * duration * 0.8
    // This represents 80% of the total rent value over the full term
    const totalRentValue = parseFloat(property.rentAmount) * property.rentDuration;
    return (totalRentValue * 0.8).toFixed(2);
  };
  
  // Calculate estimated monthly payment based on loan parameters
  const calculateMonthlyPayment = (): string => {
    const principal = parseFloat(loanAmount);
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanDuration;
    
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
  };
  
  // Calculate total repayment
  const calculateTotalRepayment = (): string => {
    const monthlyPayment = parseFloat(calculateMonthlyPayment());
    return (monthlyPayment * loanDuration).toFixed(6);
  };
  
  // Calculate total interest
  const calculateTotalInterest = (): string => {
    const principal = parseFloat(loanAmount);
    const totalRepayment = parseFloat(calculateTotalRepayment());
    return (totalRepayment - principal).toFixed(6);
  };
  
  // Check if form is valid
  const isFormValid = (): boolean => {
    const maxLoanAmount = parseFloat(calculateMaxLoanAmount());
    const requestedAmount = parseFloat(loanAmount);
    
    return (
      selectedProperty !== '' &&
      requestedAmount > 0 &&
      requestedAmount <= maxLoanAmount &&
      loanDuration >= 3 && 
      loanDuration <= 36 &&
      interestRate > 0 &&
      graceMonths >= 0 &&
      graceMonths <= 3
    );
  };
  
  // Handle loan duration slider change
  const handleLoanDurationChange = (value: number[]) => {
    setLoanDuration(value[0]);
  };
  
  // Handle interest rate slider change
  const handleInterestRateChange = (value: number[]) => {
    setInterestRate(value[0]);
  };
  
  // Handle grace months slider change
  const handleGraceMonthsChange = (value: number[]) => {
    setGraceMonths(value[0]);
  };
  
  // Handle loan amount change
  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLoanAmount(value);
    }
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
      // In a real app, this would create a blockchain transaction
      console.log('Creating loan request with:', {
        loanAmount,
        selectedProperty,
        loanDuration,
        interestRate,
        graceMonths
      });
      
      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to the loan requests list
      navigate('/loan/request');
    } catch (err) {
      console.error("Error creating loan request:", err);
      setError('Failed to create loan request. Please try again.');
    } finally {
      setCreatingRequest(false);
    }
  };
  
  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get selected property details
  const selectedPropertyDetails = rentalProperties.find(p => p.address === selectedProperty);
  
  // Check loan amount validation
  const isLoanAmountValid = (): boolean => {
    if (!loanAmount || loanAmount === '0') return false;
    
    const maxAmount = parseFloat(calculateMaxLoanAmount());
    const requestedAmount = parseFloat(loanAmount);
    
    return requestedAmount > 0 && requestedAmount <= maxAmount;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loan/request')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loan Requests
        </Button>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold">Create Loan Request</h1>
        <p className="text-muted-foreground mt-1">Request funding using your rental property as collateral</p>
      </div>
      
      {loadingProperties ? (
        <div className="flex flex-col items-center justify-center h-60">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your rental properties...</p>
        </div>
      ) : rentalProperties.length === 0 ? (
        <Alert>
          <AlertTitle>No active rental properties found</AlertTitle>
          <AlertDescription>
            You need an active rental agreement to create a loan request.
            <div className="mt-4">
              <Button onClick={() => navigate('/rental/create')}>
                Create Rental Agreement
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Collateral Selection</CardTitle>
              <CardDescription>Select a rental property to use as collateral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="property">Rental Property</Label>
                <Select
                  value={selectedProperty}
                  onValueChange={setSelectedProperty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rental property" />
                  </SelectTrigger>
                  <SelectContent>
                    {rentalProperties.map(property => (
                      <SelectItem key={property.address} value={property.address}>
                        {property.propertyAddress} ({formatAddress(property.address)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPropertyDetails && (
                <div className="rounded-lg bg-muted p-4 mt-4">
                  <div className="flex items-center mb-3">
                    <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h3 className="font-medium">Selected Property Details</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property:</span>
                      <span className="font-medium">{selectedPropertyDetails.propertyAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract:</span>
                      <span className="font-mono text-sm">{formatAddress(selectedPropertyDetails.contractAddress)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Rent:</span>
                      <span className="font-medium">{selectedPropertyDetails.rentAmount} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rental Duration:</span>
                      <span className="font-medium">{selectedPropertyDetails.rentDuration} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Loan Amount:</span>
                      <span className="font-medium">{calculateMaxLoanAmount()} ETH</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Loan Parameters</CardTitle>
              <CardDescription>Set the terms for your loan request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loan-amount" className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" /> Loan Amount
                    </Label>
                    {!isLoanAmountValid() && loanAmount !== '' && (
                      <span className="text-sm text-destructive">
                        Amount must be &lt;= {calculateMaxLoanAmount()} ETH
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="loan-amount"
                      type="text"
                      placeholder="0.0"
                      value={loanAmount}
                      onChange={handleLoanAmountChange}
                      className={!isLoanAmountValid() && loanAmount !== '' ? "border-destructive" : ""}
                    />
                    <span className="font-medium">ETH</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loan-duration" className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" /> Loan Duration
                    </Label>
                    <span className="font-medium">{loanDuration} months</span>
                  </div>
                  <Slider
                    id="loan-duration"
                    defaultValue={[loanDuration]}
                    min={3}
                    max={36}
                    step={3}
                    onValueChange={handleLoanDurationChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 months</span>
                    <span>36 months</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="interest-rate" className="flex items-center">
                      <Percent className="h-4 w-4 mr-1" /> Preferred Interest Rate
                    </Label>
                    <span className="font-medium">{interestRate}%</span>
                  </div>
                  <Slider
                    id="interest-rate"
                    defaultValue={[interestRate]}
                    min={1}
                    max={15}
                    step={0.5}
                    onValueChange={handleInterestRateChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1%</span>
                    <span>15%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is your preferred rate. Lenders may offer different rates.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grace-months" className="flex items-center">
                      <Shield className="h-4 w-4 mr-1" /> Grace Periods
                    </Label>
                    <span className="font-medium">{graceMonths} month{graceMonths !== 1 ? 's' : ''}</span>
                  </div>
                  <Slider
                    id="grace-months"
                    defaultValue={[graceMonths]}
                    min={0}
                    max={3}
                    step={1}
                    onValueChange={handleGraceMonthsChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 months</span>
                    <span>3 months</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grace periods allow you to skip payments when needed without defaulting.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <Calculator className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="font-medium">Estimated Loan Details</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-muted p-3">
                    <Label className="text-xs text-muted-foreground">Monthly Payment</Label>
                    <p className="font-medium">{calculateMonthlyPayment()} ETH</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <Label className="text-xs text-muted-foreground">Total Repayment</Label>
                    <p className="font-medium">{calculateTotalRepayment()} ETH</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <Label className="text-xs text-muted-foreground">Total Interest</Label>
                    <p className="font-medium">{calculateTotalInterest()} ETH</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <Label className="text-xs text-muted-foreground">APR</Label>
                    <p className="font-medium">{interestRate.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={creatingRequest || !isFormValid()}
              className="w-full md:w-auto"
            >
              {creatingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Creating Request...
                </>
              ) : (
                <>Create Loan Request</>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RequestCreate; 