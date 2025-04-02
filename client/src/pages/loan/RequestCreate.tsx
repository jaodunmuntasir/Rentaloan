import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../contexts/ContractContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { Slider } from '../../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Wallet, AlertTriangle, Landmark, Loader2, Home } from 'lucide-react';
import { ethers } from 'ethers';

interface RentalAgreement {
  address: string;
  propertyAddress: string;
  rentAmount: string;
  securityDepositPaid: boolean;
}

const LoanRequestCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { createLoanAgreement, rentalFactory } = useContracts();
  
  const [rentalAgreements, setRentalAgreements] = useState<RentalAgreement[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(true);
  
  const [formData, setFormData] = useState({
    rentalAddress: '',
    loanAmount: '1.0',
    interestRate: 5.0, // Default interest rate - will be set by lender
    loanDuration: 12,
    graceMonths: 1,
    preferredInterestRate: 5.0 // Preferred rate by borrower
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  
  // Fetch rental agreements for the current user
  useEffect(() => {
    const fetchRentalAgreements = async () => {
      if (!currentUser || !rentalFactory) {
        setLoadingRentals(false);
        return;
      }
      
      try {
        setLoadingRentals(true);
        
        // Get addresses of agreements where user is tenant
        const tenantAgreements = await rentalFactory.getAgreementsForTenant(currentUser.uid);
        
        // Fetch details for each agreement
        const agreementDetails = await Promise.all(
          tenantAgreements.map(async (address: string) => {
            try {
              // Create a contract instance for each agreement
              const contract = await rentalFactory.attach(address);
              
              // Cast contract to proper type with expected methods
              const rentalContract = contract as unknown as {
                propertyAddress: () => Promise<string>;
                rentAmount: () => Promise<bigint>;
                securityDepositPaid: () => Promise<boolean>;
              };
              
              // Fetch basic details
              const propertyAddress = await rentalContract.propertyAddress();
              const rentAmount = ethers.formatEther(await rentalContract.rentAmount());
              const securityDepositPaid = await rentalContract.securityDepositPaid();
              
              return {
                address,
                propertyAddress,
                rentAmount,
                securityDepositPaid
              };
            } catch (err) {
              console.error(`Error fetching details for agreement ${address}:`, err);
              return null;
            }
          })
        );
        
        // Filter out null values and only include agreements with security deposit paid
        const validAgreements = agreementDetails
          .filter(a => a !== null && a.securityDepositPaid) as RentalAgreement[];
          
        setRentalAgreements(validAgreements);
        
        // Set default rental address if there are valid agreements
        if (validAgreements.length > 0) {
          setFormData(prev => ({
            ...prev,
            rentalAddress: validAgreements[0].address
          }));
        }
      } catch (err) {
        console.error("Error fetching rental agreements:", err);
      } finally {
        setLoadingRentals(false);
      }
    };
    
    fetchRentalAgreements();
  }, [currentUser, rentalFactory]);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user edits
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string): void => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user edits
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle slider changes
  const handleSliderChange = (name: string, value: number[]): void => {
    setFormData(prev => ({ ...prev, [name]: value[0] }));
  };
  
  // Get selected rental agreement
  const getSelectedRental = (): RentalAgreement | undefined => {
    return rentalAgreements.find(a => a.address === formData.rentalAddress);
  };
  
  // Calculate maximum loan amount based on rental agreement
  const calculateMaxLoanAmount = (): string => {
    const rental = getSelectedRental();
    if (!rental) return '0';
    
    // For demo purposes, max loan is 6 months of rent
    const monthlyRent = parseFloat(rental.rentAmount);
    return (monthlyRent * 6).toFixed(4);
  };
  
  // Calculate the collateral requirements
  const calculateCollateral = (): string => {
    const loanAmount = parseFloat(formData.loanAmount);
    // For demo purposes, collateral is 20% of loan amount
    return (loanAmount * 0.2).toFixed(4);
  };
  
  // Calculate monthly payment
  const calculateMonthlyPayment = (): string => {
    const loanAmount = parseFloat(formData.loanAmount);
    const monthlyInterestRate = formData.preferredInterestRate / 100 / 12;
    const numberOfPayments = formData.loanDuration;
    
    // Simple loan formula
    const payment = loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments) / 
                   (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    return payment.toFixed(4);
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate rental address
    if (!formData.rentalAddress) {
      newErrors.rentalAddress = 'You must select a rental agreement';
    }
    
    // Validate loan amount
    if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
      newErrors.loanAmount = 'Loan amount must be greater than 0';
    } else {
      const maxLoan = parseFloat(calculateMaxLoanAmount());
      if (parseFloat(formData.loanAmount) > maxLoan) {
        newErrors.loanAmount = `Loan amount cannot exceed ${maxLoan} ETH`;
      }
    }
    
    // Validate interest rate
    if (formData.preferredInterestRate < 0) {
      newErrors.preferredInterestRate = 'Interest rate cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setGeneralError('');
      
      // Create loan agreement on blockchain
      const loanAddress = await createLoanAgreement({
        borrower: currentUser?.uid || '',
        rentalAddress: formData.rentalAddress,
        loanAmount: formData.loanAmount,
        interestRate: formData.preferredInterestRate,
        loanDuration: formData.loanDuration,
        graceMonths: formData.graceMonths
      });
      
      if (loanAddress) {
        navigate(`/loan/request/${loanAddress}`);
      } else {
        setGeneralError('Failed to create loan request. Please try again.');
      }
    } catch (err) {
      console.error("Error creating loan request:", err);
      setGeneralError('An error occurred while creating the loan request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Loan Request</h1>
      
      {rentalAgreements.length === 0 && !loadingRentals ? (
        <Card>
          <CardHeader>
            <CardTitle>No Eligible Rental Agreements</CardTitle>
            <CardDescription>
              You need an active rental agreement with a paid security deposit to request a loan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-600">
                No Eligible Rentals Found
              </AlertTitle>
              <AlertDescription>
                To request a loan, you need to have an active rental agreement with a security deposit already paid.
                Please set up a rental agreement first.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/rental/new')}>
              Create Rental Agreement
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" /> Select Rental Agreement
              </CardTitle>
              <CardDescription>
                Choose the rental agreement to be associated with this loan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingRentals ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="rentalAddress">Rental Agreement <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.rentalAddress} 
                    onValueChange={(value: string) => handleSelectChange('rentalAddress', value)}
                  >
                    <SelectTrigger id="rentalAddress" className={errors.rentalAddress ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a rental agreement" />
                    </SelectTrigger>
                    <SelectContent>
                      {rentalAgreements.map((agreement) => (
                        <SelectItem key={agreement.address} value={agreement.address}>
                          {agreement.propertyAddress} ({agreement.rentAmount} ETH/month)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.rentalAddress && (
                    <p className="text-red-500 text-sm">{errors.rentalAddress}</p>
                  )}
                </div>
              )}
              
              {formData.rentalAddress && getSelectedRental() && (
                <div className="rounded-lg bg-muted p-4 mt-4">
                  <h3 className="font-medium mb-2">Selected Rental Details</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 text-sm">
                      <span className="text-muted-foreground">Property Address:</span>
                      <span className="font-medium">{getSelectedRental()?.propertyAddress}</span>
                    </div>
                    <div className="grid grid-cols-2 text-sm">
                      <span className="text-muted-foreground">Monthly Rent:</span>
                      <span className="font-medium">{getSelectedRental()?.rentAmount} ETH</span>
                    </div>
                    <div className="grid grid-cols-2 text-sm">
                      <span className="text-muted-foreground">Maximum Loan Amount:</span>
                      <span className="font-medium">{calculateMaxLoanAmount()} ETH</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" /> Loan Details
              </CardTitle>
              <CardDescription>
                Specify the loan amount and terms you're requesting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="loanAmount">Loan Amount (ETH) <span className="text-red-500">*</span></Label>
                <div className="flex">
                  <Input 
                    id="loanAmount"
                    name="loanAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={calculateMaxLoanAmount()}
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    className={errors.loanAmount ? "border-red-500" : ""}
                  />
                  <span className="ml-2 self-center font-medium">ETH</span>
                </div>
                {errors.loanAmount && (
                  <p className="text-red-500 text-sm">{errors.loanAmount}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Maximum loan amount is based on your monthly rent
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="preferredInterestRate">Preferred Interest Rate (%)</Label>
                  <span className="text-sm text-muted-foreground">{formData.preferredInterestRate}%</span>
                </div>
                <Slider
                  id="preferredInterestRate"
                  min={0}
                  max={20}
                  step={0.5}
                  value={[formData.preferredInterestRate]}
                  onValueChange={(value) => handleSliderChange('preferredInterestRate', value)}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is your preferred rate. Lenders may offer different rates.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="loanDuration">Loan Duration</Label>
                  <span className="text-sm text-muted-foreground">{formData.loanDuration} months</span>
                </div>
                <Slider
                  id="loanDuration"
                  min={3}
                  max={36}
                  step={3}
                  value={[formData.loanDuration]}
                  onValueChange={(value) => handleSliderChange('loanDuration', value)}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3 mo</span>
                  <span>12 mo</span>
                  <span>24 mo</span>
                  <span>36 mo</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="graceMonths">Grace Months (Skip Payments)</Label>
                  <span className="text-sm text-muted-foreground">{formData.graceMonths} months</span>
                </div>
                <Slider
                  id="graceMonths"
                  min={0}
                  max={6}
                  step={1}
                  value={[formData.graceMonths]}
                  onValueChange={(value) => handleSliderChange('graceMonths', value)}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Number of months you can skip payment during the loan term
                </p>
              </div>
              
              <Separator />
              
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-3">Loan Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-1 text-sm">
                    <span>Loan Amount:</span>
                    <span className="font-medium">{formData.loanAmount} ETH</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>Required Collateral:</span>
                    <span className="font-medium">{calculateCollateral()} ETH</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>Preferred Interest Rate:</span>
                    <span className="font-medium">{formData.preferredInterestRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>Loan Duration:</span>
                    <span className="font-medium">{formData.loanDuration} months</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>Grace Months:</span>
                    <span className="font-medium">{formData.graceMonths}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between py-1 text-sm font-medium">
                    <span>Estimated Monthly Payment:</span>
                    <span>{calculateMonthlyPayment()} ETH</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm font-medium">
                    <span>Total Repayment Amount:</span>
                    <span>{(parseFloat(calculateMonthlyPayment()) * formData.loanDuration).toFixed(4)} ETH</span>
                  </div>
                </div>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200">
                <Landmark className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-600">Collateral Information</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Your loan request will require approximately {calculateCollateral()} ETH of collateral,
                  which will be held in the loan contract until all payments are completed. 
                  This protects lenders and allows for better interest rates.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          {generalError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-between items-center">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/loan/request')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading || loadingRentals || rentalAgreements.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Loan Request'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LoanRequestCreate; 