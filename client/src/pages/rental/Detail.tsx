import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import RentalAgreementDetails from '../../components/rental/RentalAgreementDetails';
import PaySecurityDeposit from '../../components/rental/PaySecurityDeposit';
import PayRent from '../../components/rental/PayRent';
import SkipRent from '../../components/rental/SkipRent';
import ExtendAgreement from '../../components/rental/ExtendAgreement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { RentalAgreementApi } from '../../services/rental.service';
import { Button } from '../../components/ui/button';
import { ChevronLeft, HomeIcon, ShieldCheck, Coins, Calendar, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

// Define a proper type for the details that includes userRole
interface RentalDetails {
  name?: string;
  tenant?: string;
  userRole?: string;
  [key: string]: any; // Allow other properties
}

const RentalDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [activeTab, setActiveTab] = useState('details');
  const { details, loading, error } = useRentalAgreement(address || '');
  const { currentUser } = useAuth();
  const { walletAddress } = useWallet();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Fetch user role directly from API
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!address || !currentUser) return;
      
      try {
        const response = await RentalAgreementApi.getRentalAgreementDetails(currentUser, address);
        if (response?.success && response?.agreement?.userRole) {
          console.log("API reports user role as:", response.agreement.userRole);
          setUserRole(response.agreement.userRole);
        }
      } catch (error) {
        console.error("Error fetching user role from API:", error);
      }
    };
    
    fetchUserRole();
  }, [address, currentUser]);
  
  // For demo purposes, let's assume this rental agreement is associated with a loan
  // In a real app, you would fetch this association from your backend or blockchain
  const demoLoanAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  
  // Handle refresh of data when actions are completed
  const handleActionSuccess = () => {
    // This could trigger a refresh of the data
    console.log("Action completed successfully");
    // Reset the active tab to details
    setActiveTab('details');
  };
  
  // Check if the current user is the renter
  const isRenter = (): boolean => {
    // If we have a direct API confirmation of the role, use that first
    if (userRole === 'renter') {
      console.log("Using API-provided role: renter");
      return true;
    }
    
    if (!details || !currentUser) {
      console.log("No details or currentUser available", { details, currentUser });
      return false;
    }
    
    console.log("Checking renter status:", { 
      details, 
      currentUser, 
      userRole: (details as RentalDetails).userRole,
      tenant: details.tenant,
      walletAddress
    });
    
    // Check if details has userRole property
    if ((details as RentalDetails).userRole === 'renter') {
      console.log("User role is 'renter' from details");
      return true;
    }
    
    // Otherwise check wallet addresses if available
    // Get wallet address from wallet context instead of currentUser
    if (!walletAddress || !details.tenant) {
      console.log("Missing wallet address or tenant address", { walletAddress, tenant: details.tenant });
      return false;
    }
    
    // Compare the wallet addresses
    const isMatching = walletAddress.toLowerCase() === details.tenant.toLowerCase();
    console.log("Comparing addresses", { 
      walletAddress: walletAddress.toLowerCase(), 
      tenant: details.tenant.toLowerCase(),
      isMatching
    });
    
    return isMatching;
  };
  
  // Update active tab to details if user isn't renter and tries to access renter-only tabs
  useEffect(() => {
    const renterOnlyTabs = ['security', 'pay', 'skip'];
    if (!isRenter() && renterOnlyTabs.includes(activeTab)) {
      setActiveTab('details');
    }
  }, [activeTab, details, currentUser, userRole, walletAddress]);
  
  // Format the contract address
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  if (!address) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>No rental agreement address provided</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link to="/rentals">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Rentals
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {(details as RentalDetails)?.name || 'Rental Agreement'}
          </h1>
          <p className="text-muted-foreground">
            Contract: {formatAddress(address)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/rentals">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Rentals
          </Link>
        </Button>
      </div>
      
      <Separator className="my-6" />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <HomeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          
          {/* Only show action tabs for renters */}
          {isRenter() && (
            <>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Security Deposit</span>
              </TabsTrigger>
              <TabsTrigger value="pay" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">Pay Rent</span>
              </TabsTrigger>
              <TabsTrigger value="skip" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Skip Rent</span>
              </TabsTrigger>
            </>
          )}
          
          <TabsTrigger value="extend" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Extend</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <RentalAgreementDetails contractAddress={address} />
        </TabsContent>
        
        {isRenter() && (
          <>
            <TabsContent value="security" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Deposit</CardTitle>
                  <CardDescription>
                    Pay your security deposit to activate the rental agreement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaySecurityDeposit 
                    contractAddress={address} 
                    onSuccess={handleActionSuccess}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pay" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pay Rent</CardTitle>
                  <CardDescription>
                    Make your monthly rent payment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PayRent 
                    contractAddress={address} 
                    onSuccess={handleActionSuccess}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="skip" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skip Rent</CardTitle>
                  <CardDescription>
                    Request to skip a rent payment using your loan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SkipRent 
                    rentalContractAddress={address} 
                    loanContractAddress={demoLoanAddress}
                    onSuccess={handleActionSuccess}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
        
        <TabsContent value="extend" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Extend Agreement</CardTitle>
              <CardDescription>
                Extend your current rental agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExtendAgreement 
                contractAddress={address} 
                onSuccess={handleActionSuccess}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RentalDetail; 