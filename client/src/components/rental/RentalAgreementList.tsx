import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
import { useWallet } from '../../contexts/WalletContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Home, CalendarClock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '../ui/separator';
import { ethers} from 'ethers';
import { RentalApi } from '../../services/api.service';

// Extended interface for RentalAgreementSummary with additional properties
interface RentalAgreementSummary {
  address: string;
  name?: string;
  propertyAddress: string;
  isActive: boolean;
  isExpired: boolean;
  isTerminated: boolean;
  rentAmount: string; // Changed to string to match contract data
  tenant: string;
  landlord: string;
  securityDepositPaid: boolean;
  startDate?: Date;
  endDate?: Date;
  isUserTenant: boolean;
}

const RentalAgreementCard: React.FC<{
  agreement: RentalAgreementSummary;
  isUserTenant: boolean;
  onSelect: (address: string) => void;
}> = ({ agreement, isUserTenant, onSelect }) => {
  const getStatusBadge = () => {
    if (agreement.isActive) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
    if (agreement.isTerminated) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Terminated</Badge>;
    }
    if (agreement.isExpired) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expired</Badge>;
    }
    if (!agreement.securityDepositPaid) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {agreement.name || 'Rental Agreement'} {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {agreement.propertyAddress || 'Address not specified'}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Contract</div>
            <div className="font-mono text-xs">{formatAddress(agreement.address)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center">
              <Home className="h-3 w-3 mr-1" /> Rent Amount
            </div>
            <div className="font-medium">{agreement.rentAmount} ETH / month</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center">
              <CalendarClock className="h-3 w-3 mr-1" /> Duration
            </div>
            <div className="font-medium">
              {agreement.startDate?.toLocaleDateString()} - {agreement.endDate?.toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Role</div>
            <div className="font-medium">{isUserTenant ? 'Tenant' : 'Landlord'}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              {isUserTenant ? 'Landlord' : 'Tenant'}
            </div>
            <div className="font-medium">
              {formatAddress(isUserTenant ? agreement.landlord : agreement.tenant)}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => onSelect(agreement.address)}
        >
          View Details <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

const RentalAgreementList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Fixed: using currentUser instead of user
  const { rentalFactory, getRentalContract } = useContracts(); // Use getRentalContract
  const { walletAddress } = useWallet(); // Get the connected wallet address
  const [agreements, setAgreements] = useState<RentalAgreementSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all rental agreements for the current user
  useEffect(() => {
    const fetchAgreements = async () => {
      if (!currentUser || !rentalFactory) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        console.log("Fetching rental agreements for user:", currentUser.uid);
        
        let allAddresses = [];
        
        try {
          // First try to get from blockchain
          // Get agreements where user is renter/tenant
          const tenantAgreements = await rentalFactory.getRenterAgreements();
          console.log("Renter agreements:", tenantAgreements);
          
          // Get agreements where user is landlord
          const landlordAgreements = await rentalFactory.getLandlordAgreements();
          console.log("Landlord agreements:", landlordAgreements);
          
          // Extract the contract addresses
          const tenantAddresses = [];
          for (let i = 0; i < tenantAgreements.length; i++) {
            tenantAddresses.push(tenantAgreements[i].contractAddress);
          }
          
          const landlordAddresses = [];
          for (let i = 0; i < landlordAgreements.length; i++) {
            landlordAddresses.push(landlordAgreements[i].contractAddress);
          }
          
          // Combine and remove duplicates
          allAddresses = Array.from(new Set([...tenantAddresses, ...landlordAddresses]));
        } catch (blockchainError) {
          console.error("Error fetching agreements from blockchain:", blockchainError);
          
          // Fallback to server API
          try {
            console.log("Falling back to server API");
            const response = await RentalApi.getRentals(currentUser);
            if (response && response.agreements) {
              allAddresses = response.agreements.map((agreement: any) => agreement.contractAddress);
            }
          } catch (apiError) {
            console.error("Error fetching agreements from API:", apiError);
            setError("Failed to load rental agreements. Please try again later.");
            setLoading(false);
            return;
          }
        }
        
        console.log("All agreement addresses:", allAddresses);
        
        if (allAddresses.length === 0) {
          setAgreements([]);
          setLoading(false);
          return;
        }
        
        // Fetch details for each agreement
        const agreementPromises = allAddresses.map(async (address: string) => {
          try {
            // Get rental contract using the context method
            const contract = await getRentalContract(address);
            if (!contract) return null;
            
            console.log("Fetching details for contract:", address);
            
            try {
              // Get details from the contract
              const details = await contract.getContractDetails();
              console.log("Contract details:", details);
              
              // Extract values from the returned array (format depends on contract implementation)
              const landlord = details[0]; // First element is usually the landlord address
              const tenant = details[1]; // Second element is usually the tenant/renter address
              const duration = Number(details[2]);
              const securityDeposit = ethers.formatEther(details[3]); // Convert to ETH
              const rentAmount = ethers.formatEther(details[4]); // Convert to ETH
              const gracePeriod = Number(details[5]);
              const statusCode = Number(details[6]);
              
              // Determine if security deposit is paid by checking status
              const securityDepositPaid = statusCode > 0;
              
              // Create readable property details
              const propertyAddress = `Property at ${address.substring(0, 10)}...`;
              const propertyName = 'Property ' + address.substring(0, 6);
              
              // Determine agreement status
              const isActive = statusCode === 1; // Assuming 1 is the ACTIVE status code
              const isExpired = false; // We don't have direct expired status
              const isTerminated = statusCode === 2; // Assuming 2 is the TERMINATED status code
              
              // Set dates based on duration
              const startDate = new Date();
              const endDate = new Date(startDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000); // Approximate months
              
              // Get current user address to determine role
              const userAddressFromWallet = walletAddress?.toLowerCase() || '';
              const isUserTenant = tenant.toLowerCase() === userAddressFromWallet;
              
              return {
                address,
                name: propertyName,
                propertyAddress,
                isActive,
                isExpired,
                isTerminated,
                rentAmount,
                tenant,
                landlord,
                securityDepositPaid,
                startDate,
                endDate,
                isUserTenant
              };
            } catch (contractError) {
              console.error(`Error accessing contract data for ${address}:`, contractError);
              
              // Try to get details from the API as a fallback
              try {
                const apiData = await RentalApi.getRental(currentUser, address);
                if (apiData && apiData.agreement) {
                  const agreement = apiData.agreement;
                  const userRole = agreement.userRole;
                  
                  return {
                    address,
                    name: agreement.name || `Property ${address.substring(0, 6)}`,
                    propertyAddress: `Property at ${address.substring(0, 10)}...`,
                    isActive: agreement.status === 'ACTIVE',
                    isExpired: false,
                    isTerminated: agreement.status === 'TERMINATED',
                    rentAmount: agreement.baseRent,
                    tenant: agreement.renter?.walletAddress || 'Unknown',
                    landlord: agreement.landlord?.walletAddress || 'Unknown',
                    securityDepositPaid: agreement.status !== 'INITIALIZED',
                    startDate: new Date(agreement.createdAt),
                    endDate: new Date(new Date(agreement.createdAt).getTime() + 
                      agreement.duration * 30 * 24 * 60 * 60 * 1000),
                    isUserTenant: userRole === 'renter'
                  };
                }
              } catch (apiError) {
                console.error(`Error fetching API data for ${address}:`, apiError);
              }
              
              // Fallback to simplified data
              return {
                address,
                name: `Property ${address.substring(0, 6)}`,
                propertyAddress: `Address for ${address.substring(0, 10)}...`,
                isActive: true,
                isExpired: false,
                isTerminated: false,
                rentAmount: "0",
                tenant: "Unknown",
                landlord: "Unknown",
                securityDepositPaid: false,
                startDate: new Date(),
                endDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
                isUserTenant: false
              };
            }
          } catch (err) {
            console.error(`Error fetching details for agreement ${address}:`, err);
            return null;
          }
        });
        
        const agreementDetails = await Promise.all(agreementPromises);
        
        // Filter out null values and cast as RentalAgreementSummary[]
        const validAgreements = agreementDetails.filter(a => a !== null) as RentalAgreementSummary[];
        setAgreements(validAgreements);
        
      } catch (err) {
        console.error("Error fetching rental agreements:", err);
        setError("Failed to load rental agreements. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgreements();
  }, [currentUser, rentalFactory, getRentalContract, walletAddress]);
  
  const handleSelectAgreement = (address: string) => {
    navigate(`/rental/${address}`);
  };
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Rental Agreements</CardTitle>
          <CardDescription>Loading your agreements...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Rental Agreements</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (agreements.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Rental Agreements</CardTitle>
          <CardDescription>You don't have any rental agreements yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground mb-4">
            Get started by creating a new rental agreement
          </p>
          <Button onClick={() => navigate('/rental/create')}>
            Create Rental Agreement
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Split agreements into tenant and landlord groups
  const tenantAgreements = agreements.filter(a => a.isUserTenant);
  const landlordAgreements = agreements.filter(a => !a.isUserTenant);
  
  return (
    <div className="space-y-6">
      {tenantAgreements.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Properties You're Renting</h2>
          {tenantAgreements.map(agreement => (
            <RentalAgreementCard
              key={agreement.address}
              agreement={agreement}
              isUserTenant={true}
              onSelect={handleSelectAgreement}
            />
          ))}
        </div>
      )}
      
      {landlordAgreements.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Properties You're Renting Out</h2>
          {landlordAgreements.map(agreement => (
            <RentalAgreementCard
              key={agreement.address}
              agreement={agreement}
              isUserTenant={false}
              onSelect={handleSelectAgreement}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RentalAgreementList;