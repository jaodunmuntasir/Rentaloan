import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Home, CalendarClock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '../ui/separator';
import { ethers} from 'ethers';

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
        
        // Get agreements where user is renter/tenant
        const tenantAgreements = await rentalFactory.getRenterAgreements();
        console.log("Renter agreements:", tenantAgreements);
        
        // Get agreements where user is landlord
        const landlordAgreements = await rentalFactory.getLandlordAgreements();
        console.log("Landlord agreements:", landlordAgreements);
        
        // Extract the contract addresses
        const tenantAddresses = tenantAgreements.map((info: any) => info.contractAddress);
        const landlordAddresses = landlordAgreements.map((info: any) => info.contractAddress);
        
        // Combine and remove duplicates
        const allAddresses = Array.from(new Set([...tenantAddresses, ...landlordAddresses]));
        console.log("All agreement addresses:", allAddresses);
        
        // Fetch details for each agreement
        const agreementPromises = allAddresses.map(async (address) => {
          try {
            // Get rental contract using the context method
            const contract = await getRentalContract(address);
            if (!contract) return null;
            
            console.log("Fetching details for contract:", address);
            
            // Try to fetch basic contract data (adapt to actual contract methods)
            try {
              // Get details from the contract
              const details = await contract.getContractDetails();
              console.log("Contract details:", details);
              
              // Extract values from the returned array (format depends on contract implementation)
              const landlord = details[0]; // First element is usually the landlord address
              const tenant = details[1]; // Second element is usually the tenant/renter address
              const rentAmount = ethers.formatEther(details[3]); // Assuming index 3 is the rent amount
              
              // Check for deposit paid status and active state
              let depositStatus = false;
              try {
                // Try to call a direct function if it exists
                depositStatus = await contract.securityDepositPaid();
              } catch (depositError) {
                console.log("Couldn't get deposit status via direct method:", depositError);
                // Use details from getContractDetails instead
                depositStatus = details[4] > 0; // If there's a positive security deposit, consider it paid
              }
              console.log("Deposit status:", depositStatus);
              
              // Create a property address from the contract address
              const propertyAddress = `Property at ${address.substring(0, 10)}...`;
              
              // Additional properties 
              const propertyName = 'Property ' + address.substring(0, 6);
              const isActive = true; // Default to true if no direct method exists
              const isExpired = false; 
              const isTerminated = false;
              const startDate = new Date();
              const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
              
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
                securityDepositPaid: depositStatus,
                startDate,
                endDate
              };
            } catch (contractError) {
              console.error(`Error accessing contract data for ${address}:`, contractError);
              
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
                endDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000) 
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
  }, [currentUser, rentalFactory, getRentalContract]);
  
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
  const tenantAgreements = agreements.filter(a => 
    currentUser && a.tenant.toLowerCase() === currentUser.uid.toLowerCase()
  );
  const landlordAgreements = agreements.filter(a => 
    currentUser && a.landlord.toLowerCase() === currentUser.uid.toLowerCase()
  );
  
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