import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
import { useWallet } from '../../contexts/WalletContext';
import { RentalApi } from '../../services/api.service';
import { useToast } from '../../contexts/ToastContext';
import { UserApi } from '../../services/api.service';

// UI Components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { Loader2, Mail, User, Calendar, Wallet, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';

const RentalCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser: user } = useAuth();
  const { showToast } = useToast();
  const { createRentalAgreement } = useContracts();
  const { isConnected } = useWallet();

  const [formData, setFormData] = useState({
    name: '',
    tenantEmail: '',
    duration: 12,
    baseRent: '0.1',
    securityDeposit: '0.2',
  });

  const [tenant, setTenant] = useState<{
    id: string;
    email: string;
    name: string;
    walletAddress: string | null;
  } | null>(null);

  const [searchingTenant, setSearchingTenant] = useState(false);
  const [tenantError, setTenantError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  // Calculate the grace period based on security deposit and base rent
  const calculateGracePeriod = (): number => {
    if (!formData.securityDeposit || !formData.baseRent || 
        parseFloat(formData.securityDeposit) <= 0 || 
        parseFloat(formData.baseRent) <= 0) {
      return 0;
    }

    // Calculate grace period as security deposit / base rent
    let gracePeriod = Math.floor(parseFloat(formData.securityDeposit) / parseFloat(formData.baseRent));
    
    // Grace period must be greater than 0
    if (gracePeriod <= 0) {
      gracePeriod = 1;
    }
    
    // Grace period must be <= duration/2 as per contract requirements
    const maxGracePeriod = Math.floor(formData.duration / 2);
    if (gracePeriod > maxGracePeriod) {
      gracePeriod = maxGracePeriod;
    }
    
    return gracePeriod;
  };

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

  const findTenant = async () => {
    if (!formData.tenantEmail) {
      setTenantError('Please enter a tenant email address');
      return;
    }

    try {
      setSearchingTenant(true);
      setTenantError('');
      setTenant(null);
      
      const response = await UserApi.findUserByEmail(user, formData.tenantEmail);
      
      if (response.success && response.data) {
        setTenant(response.data);
        showToast('Tenant found!', 'success');
      } else {
        setTenantError('No user found with this email address');
      }
    } catch (err) {
      console.error('Error finding tenant:', err);
      setTenantError('Failed to find tenant. Please try again.');
    } finally {
      setSearchingTenant(false);
    }
  };

  // Validate form
  const validateForm = (): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Agreement name is required';
    }

    if (!tenant) {
      newErrors.tenantEmail = 'Please find and select a tenant';
    } else if (!tenant.walletAddress) {
      newErrors.tenantEmail = 'The selected tenant does not have a wallet address';
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    } else if (!Number.isInteger(Number(formData.duration))) {
      newErrors.duration = 'Duration must be a whole number';
    }

    if (!formData.baseRent || parseFloat(formData.baseRent) <= 0) {
      newErrors.baseRent = 'Monthly rent is required and must be greater than 0';
    }

    if (!formData.securityDeposit || parseFloat(formData.securityDeposit) <= 0) {
      newErrors.securityDeposit = 'Security deposit is required and must be greater than 0';
    } else if (parseFloat(formData.securityDeposit) < parseFloat(formData.baseRent)) {
      newErrors.securityDeposit = 'Security deposit must be greater than or equal to monthly rent';
    }

    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      setGeneralError('');
      
      if (!tenant || !tenant.walletAddress) {
        throw new Error('Tenant wallet address is missing');
      }

      // Step 1: Create rental agreement on the blockchain
      console.log("Creating rental agreement on blockchain with parameters:", {
        tenant: tenant.walletAddress,
        duration: formData.duration,
        securityDeposit: formData.securityDeposit,
        baseRent: formData.baseRent,
        gracePeriod: calculateGracePeriod(),
        name: formData.name
      });

      const tx = await createRentalAgreement(
        tenant.walletAddress,
        formData.duration,
        formData.securityDeposit,
        formData.baseRent,
        calculateGracePeriod(),
        formData.name
      );

      if (!tx || !tx.contractAddress || !tx.transactionHash) {
        throw new Error('Failed to create rental agreement on the blockchain');
      }

      console.log("Contract successfully created at address:", tx.contractAddress);

      // Step 2: Store contract data in the database
      console.log("Storing contract in database:", {
        contractAddress: tx.contractAddress,
        renterEmail: tenant.email,
        duration: formData.duration,
        securityDeposit: formData.securityDeposit,
        baseRent: formData.baseRent,
        name: formData.name,
        transactionHash: tx.transactionHash
      });
      
      const rentalData = {
        contractAddress: tx.contractAddress,
        renterEmail: tenant.email,
        duration: parseInt(formData.duration.toString()),
        securityDeposit: formData.securityDeposit,
        baseRent: formData.baseRent,
        name: formData.name,
        transactionHash: tx.transactionHash
      };
      
      try {
        const createdAgreement = await RentalApi.createRental(
          user,
          rentalData
        );

        if (!createdAgreement.success) {
          throw new Error('Failed to save rental agreement to the database');
        }

        showToast('Rental agreement created successfully!', 'success');
        
        // Navigate to the rental details page
        navigate(`/rental/${tx.contractAddress}`);
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Even if the database save fails, we should show that the contract was created
        showToast('Contract was created on blockchain, but database storage failed. Contract address: ' + tx.contractAddress, 'warning');
        setGeneralError('Contract was created on blockchain, but failed to save to the database. You can find your contract at address: ' + tx.contractAddress);
      }
    } catch (err: any) {
      console.error('Error creating rental agreement:', err);
      
      // If the error has a data property, it might be a blockchain error with details
      if (err.data) {
        setGeneralError(`Blockchain error: ${err.data.message || err.message || 'Unknown error'}`);
      } else {
        setGeneralError(err.message || 'Failed to create rental agreement. Please try again.');
      }
      
      showToast('Failed to create rental agreement', 'error');
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
              <Label htmlFor="name">Agreement Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name"
                name="name"
                placeholder="Apartment Rental Agreement"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantEmail">Tenant Email <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input 
                    id="tenantEmail"
                    name="tenantEmail"
                    placeholder="tenant@example.com"
                    value={formData.tenantEmail}
                    onChange={handleInputChange}
                    className={`pl-10 ${tenantError ? "border-red-500" : ""}`}
                  />
                </div>
                <Button 
                  type="button"
                  onClick={findTenant}
                  disabled={searchingTenant || !formData.tenantEmail}
                >
                  {searchingTenant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {searchingTenant ? 'Searching...' : 'Find & Select'}
                </Button>
              </div>
              {tenantError && (
                <p className="text-red-500 text-sm">{tenantError}</p>
              )}
              {tenant && (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertTitle>Tenant Found: {tenant.name}</AlertTitle>
                  <AlertDescription>
                    Email: {tenant.email}<br />
                    Wallet Address: {tenant.walletAddress || 'Not set'}
                    {!tenant.walletAddress && (
                      <p className="text-amber-600 mt-1 font-medium">
                        This tenant doesn't have a wallet address. They need to set up their wallet before you can create a rental agreement.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" /> Agreement Duration
            </CardTitle>
            <CardDescription>Set the duration for the rental</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="duration">Rent Duration (months) <span className="text-red-500">*</span></Label>
              <Input 
                id="duration"
                name="duration"
                type="number"
                min="1"
                step="1"
                value={formData.duration}
                onChange={handleInputChange}
                className={errors.duration ? "border-red-500" : ""}
              />
              {errors.duration && (
                <p className="text-red-500 text-sm">{errors.duration}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Specify the number of months for the rental agreement
              </p>
            </div>
            
            <div className="rounded-lg bg-muted p-4">
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium ml-2">{new Date().toLocaleDateString()}</span>
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
              <Label htmlFor="baseRent">Monthly Rent (ETH) <span className="text-red-500">*</span></Label>
              <div className="flex">
                <Input 
                  id="baseRent"
                  name="baseRent"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.baseRent}
                  onChange={handleInputChange}
                  className={errors.baseRent ? "border-red-500" : ""}
                />
                <span className="ml-2 self-center font-medium">ETH</span>
              </div>
              {errors.baseRent && (
                <p className="text-red-500 text-sm">{errors.baseRent}</p>
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
                  <span className="font-medium">{formData.baseRent} ETH</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Security Deposit:</span>
                  <span className="font-medium">{formData.securityDeposit} ETH</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Total Duration:</span>
                  <span className="font-medium">{formData.duration} months</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Grace Period:</span>
                  <span className="font-medium">{calculateGracePeriod()} months</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Grace period is automatically calculated as security deposit ÷ monthly rent, 
                  capped at duration ÷ 2 months per the contract requirements. This is the period during which late fees won't apply.
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between py-1 text-sm font-medium">
                  <span>Total Contract Value:</span>
                  <span>{(parseFloat(formData.baseRent) * formData.duration + parseFloat(formData.securityDeposit)).toFixed(4)} ETH</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {generalError && (
          <Alert className="mb-6">
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
            disabled={loading || !isConnected || !tenant || !tenant.walletAddress}
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