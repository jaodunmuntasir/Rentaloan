import React, { useState } from 'react';
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
import { Home, Calendar, Wallet, Mail, User, Loader2, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';

const RentalCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { createRentalAgreement } = useContracts();
  
  const [formData, setFormData] = useState({
    tenantEmail: '',
    propertyAddress: '',
    propertyNftId: '0', // Default NFT ID
    rentAmount: '0.1',
    securityDeposit: '0.2',
    rentDuration: 12,
    paymentInterval: 1
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  
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
  
  // Handle slider changes
  const handleSliderChange = (name: string, value: number[]) => {
    setFormData(prev => ({ ...prev, [name]: value[0] }));
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate tenant email
    if (!formData.tenantEmail) {
      newErrors.tenantEmail = 'Tenant email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.tenantEmail)) {
      newErrors.tenantEmail = 'Please enter a valid email address';
    }
    
    // Validate property address
    if (!formData.propertyAddress) {
      newErrors.propertyAddress = 'Property address is required';
    }
    
    // Validate rent amount
    if (!formData.rentAmount || parseFloat(formData.rentAmount) <= 0) {
      newErrors.rentAmount = 'Rent amount must be greater than 0';
    }
    
    // Validate security deposit
    if (!formData.securityDeposit || parseFloat(formData.securityDeposit) <= 0) {
      newErrors.securityDeposit = 'Security deposit must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Calculate end date based on duration
  const calculateEndDate = (): string => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + formData.rentDuration);
    return endDate.toLocaleDateString();
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setGeneralError('');
      
      // Convert tenant email to wallet address
      // In a real app, you would get this from your backend or an API
      // For demo purposes, we're using a placeholder wallet address
      const tenantAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      
      // Create rental agreement on blockchain
      const agreementAddress = await createRentalAgreement({
        tenant: tenantAddress,
        propertyAddress: formData.propertyAddress,
        propertyNftId: formData.propertyNftId,
        rentAmount: formData.rentAmount,
        securityDeposit: formData.securityDeposit,
        rentDuration: formData.rentDuration,
        paymentInterval: formData.paymentInterval
      });
      
      if (agreementAddress) {
        navigate(`/rental/${agreementAddress}`);
      } else {
        setGeneralError('Failed to create rental agreement. Please try again.');
      }
    } catch (err) {
      console.error("Error creating rental agreement:", err);
      setGeneralError('An error occurred while creating the rental agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Rental Agreement</h1>
      
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" /> Tenant Information
            </CardTitle>
            <CardDescription>Enter the details of the tenant who will be renting the property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantEmail">Tenant Email <span className="text-red-500">*</span></Label>
              <div className="flex">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground self-center" />
                <Input 
                  id="tenantEmail"
                  name="tenantEmail"
                  placeholder="tenant@example.com"
                  value={formData.tenantEmail}
                  onChange={handleInputChange}
                  className={errors.tenantEmail ? "border-red-500" : ""}
                />
              </div>
              {errors.tenantEmail && (
                <p className="text-red-500 text-sm">{errors.tenantEmail}</p>
              )}
              <p className="text-sm text-muted-foreground">
                The tenant will receive an invitation to accept the rental agreement
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="h-5 w-5 mr-2" /> Property Details
            </CardTitle>
            <CardDescription>Enter information about the property being rented</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address <span className="text-red-500">*</span></Label>
              <Input 
                id="propertyAddress"
                name="propertyAddress"
                placeholder="123 Main St, City, State, ZIP"
                value={formData.propertyAddress}
                onChange={handleInputChange}
                className={errors.propertyAddress ? "border-red-500" : ""}
              />
              {errors.propertyAddress && (
                <p className="text-red-500 text-sm">{errors.propertyAddress}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="propertyNftId">Property NFT ID (optional)</Label>
              <Input 
                id="propertyNftId"
                name="propertyNftId"
                placeholder="0"
                value={formData.propertyNftId}
                onChange={handleInputChange}
              />
              <p className="text-sm text-muted-foreground">
                If the property is represented as an NFT, enter its ID
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" /> Agreement Duration
            </CardTitle>
            <CardDescription>Set the duration and payment schedule for the rental</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="rentDuration">Rent Duration</Label>
                <span className="text-sm text-muted-foreground">{formData.rentDuration} months</span>
              </div>
              <Slider
                id="rentDuration"
                min={1}
                max={36}
                step={1}
                value={[formData.rentDuration]}
                onValueChange={(value) => handleSliderChange('rentDuration', value)}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 mo</span>
                <span>12 mo</span>
                <span>24 mo</span>
                <span>36 mo</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="paymentInterval">Payment Interval</Label>
                <span className="text-sm text-muted-foreground">Every {formData.paymentInterval} month(s)</span>
              </div>
              <Slider
                id="paymentInterval"
                min={1}
                max={3}
                step={1}
                value={[formData.paymentInterval]}
                onValueChange={(value) => handleSliderChange('paymentInterval', value)}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Monthly</span>
                <span>Bi-monthly</span>
                <span>Quarterly</span>
              </div>
            </div>
            
            <div className="rounded-lg bg-muted p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium ml-2">{new Date().toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="font-medium ml-2">{calculateEndDate()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" /> Financial Terms
            </CardTitle>
            <CardDescription>Set the rent amount and security deposit for the agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Monthly Rent (ETH) <span className="text-red-500">*</span></Label>
              <div className="flex">
                <Input 
                  id="rentAmount"
                  name="rentAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.rentAmount}
                  onChange={handleInputChange}
                  className={errors.rentAmount ? "border-red-500" : ""}
                />
                <span className="ml-2 self-center font-medium">ETH</span>
              </div>
              {errors.rentAmount && (
                <p className="text-red-500 text-sm">{errors.rentAmount}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit (ETH) <span className="text-red-500">*</span></Label>
              <div className="flex">
                <Input 
                  id="securityDeposit"
                  name="securityDeposit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.securityDeposit}
                  onChange={handleInputChange}
                  className={errors.securityDeposit ? "border-red-500" : ""}
                />
                <span className="ml-2 self-center font-medium">ETH</span>
              </div>
              {errors.securityDeposit && (
                <p className="text-red-500 text-sm">{errors.securityDeposit}</p>
              )}
            </div>
            
            <Separator className="my-4" />
            
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium mb-2">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 text-sm">
                  <span>Monthly Rent:</span>
                  <span className="font-medium">{formData.rentAmount} ETH</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Security Deposit:</span>
                  <span className="font-medium">{formData.securityDeposit} ETH</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Total Duration:</span>
                  <span className="font-medium">{formData.rentDuration} months</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between py-1 text-sm font-medium">
                  <span>Total Contract Value:</span>
                  <span>{(parseFloat(formData.rentAmount) * formData.rentDuration + parseFloat(formData.securityDeposit)).toFixed(4)} ETH</span>
                </div>
              </div>
            </div>
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
            onClick={() => navigate('/rental')}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Rental Agreement'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RentalCreate; 