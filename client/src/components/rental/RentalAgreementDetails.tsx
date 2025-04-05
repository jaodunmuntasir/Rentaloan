import React from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar, Home, Wallet, Shield, FileText, Loader2, Users } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface RentalAgreementDetailsProps {
  contractAddress: string;
}

// Extend the RentalAgreementDetails interface with additional properties needed for UI
interface ExtendedRentalDetails {
  // Original properties from RentalAgreementDetails
  landlord: string;
  tenant: string;
  propertyAddress: string;
  propertyNftId: string;
  rentAmount: string;
  securityDeposit: string;
  currentSecurityDeposit?: string;
  gracePeriod?: number;
  rentDuration: number;
  paymentInterval: number;
  nextPaymentDate: Date;
  isActive: boolean;
  securityDepositPaid: boolean;
  currentRentPaid: boolean;
  
  // Additional UI properties
  name?: string;
  startDate?: Date;
  currentMonth?: number;
  isTerminated?: boolean;
  isExpired?: boolean;
  securityDepositPaymentDate?: Date;
  userRole?: 'landlord' | 'renter' | 'none';
  landlordDetails?: {
    email?: string;
    walletAddress?: string;
  };
  renterDetails?: {
    email?: string;
    walletAddress?: string;
  };
}

const RentalAgreementDetails: React.FC<RentalAgreementDetailsProps> = ({
  contractAddress
}) => {
  const { details: contractDetails, loading, error } = useRentalAgreement(contractAddress);
  const { currentUser } = useAuth();
  
  // Create an extended details object with UI-specific properties
  const details = contractDetails ? {
    ...contractDetails,
    name: contractDetails.name || 'Rental Agreement',
    startDate: contractDetails.nextPaymentDate ? 
      new Date(contractDetails.nextPaymentDate.getTime() - (30 * 24 * 60 * 60 * 1000)) : new Date(),
    currentMonth: contractDetails.currentMonth || contractDetails.lastPaidMonth || 0,
    isTerminated: false,
    isExpired: false,
    securityDepositPaymentDate: contractDetails.securityDepositPaid ? new Date() : undefined,
    // Extract additional blockchain data
    currentSecurityDeposit: contractDetails.currentSecurityDeposit || contractDetails.securityDeposit,
    gracePeriod: contractDetails.gracePeriod || Math.floor(Number(contractDetails.securityDeposit) / Number(contractDetails.rentAmount))
  } as ExtendedRentalDetails : null;
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get status badge
  const getStatusBadge = () => {
    if (!details) return null;
    
    // Agreement is active
    if (details.isActive) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
    
    // Agreement is terminated
    if (details.isTerminated) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Terminated</Badge>;
    }
    
    // Agreement is expired
    if (details.isExpired) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expired</Badge>;
    }
    
    // Agreement is pending (not fully set up)
    if (!details.securityDepositPaid) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>;
    }
    
    return <Badge variant="outline">Unknown</Badge>;
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!details) return 0;
    
    const rentDuration = details.rentDuration;
    const currentMonth = details.currentMonth || 0;
    
    return Math.min(Math.round((currentMonth / rentDuration) * 100), 100);
  };
  
  // Check if current user is renter
  const isCurrentUserRenter = () => {
    if (!details || !currentUser) return false;
    return details.userRole === 'renter' || 
           (currentUser.walletAddress && 
            currentUser.walletAddress.toLowerCase() === details.tenant.toLowerCase());
  };
  
  // Loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rental Agreement</CardTitle>
          <CardDescription>Loading details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (error || !details) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rental Agreement</CardTitle>
          <CardDescription className="text-destructive">
            {error || "Failed to load rental details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Contract Data Not Available</AlertTitle>
            <AlertDescription>
              There was an error fetching data from the blockchain for contract address: {contractAddress}. 
              {error && <div className="mt-2 text-xs overflow-auto max-h-[100px]">{error}</div>}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm">
            <p className="mb-2">Debugging tips:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Make sure your wallet is connected to the correct network</li>
              <li>Verify that the contract address is correct</li>
              <li>Check that the contract has been properly deployed</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {details.name} {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              Contract: {formatAddress(contractAddress)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 py-4">
            <div>
              <div className="mb-2">
                <span className="text-sm text-muted-foreground">Rental Progress</span>
              </div>
              <div className="space-y-2">
                <Progress value={calculateProgress()} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Start</span>
                  <span>Month {details.currentMonth || 0} of {details.rentDuration}</span>
                  <span>End</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Parties Card - NEW */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-primary/10 py-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" /> Parties
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="grid grid-cols-[1fr_2fr] text-sm">
                    <span className="text-muted-foreground">Landlord:</span>
                    <span className="font-medium overflow-hidden text-ellipsis">{formatAddress(details.landlord)}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_2fr] text-sm">
                    <span className="text-muted-foreground">Renter:</span>
                    <span className="font-medium overflow-hidden text-ellipsis">{formatAddress(details.tenant)}</span>
                  </div>
                  {details.landlordDetails?.email && (
                    <div className="grid grid-cols-[1fr_2fr] text-sm">
                      <span className="text-muted-foreground">Landlord Email:</span>
                      <span className="font-medium overflow-hidden text-ellipsis">{details.landlordDetails.email}</span>
                    </div>
                  )}
                  {details.renterDetails?.email && (
                    <div className="grid grid-cols-[1fr_2fr] text-sm">
                      <span className="text-muted-foreground">Renter Email:</span>
                      <span className="font-medium overflow-hidden text-ellipsis">{details.renterDetails.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Duration Card - MODIFIED */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-primary/10 py-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" /> Duration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">{details.startDate?.toLocaleDateString() || 'Not specified'}</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{details.rentDuration} months</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Grace Period:</span>
                    <span className="font-medium">{details.gracePeriod} months</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Financial Card - MODIFIED */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-primary/10 py-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Wallet className="h-4 w-4 mr-2" /> Financial
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Monthly Rent:</span>
                    <span className="font-medium">{details.rentAmount} ETH</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Security Deposit:</span>
                    <span className="font-medium">{details.securityDeposit} ETH</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Current Security Deposit:</span>
                    <span className="font-medium">{details.currentSecurityDeposit} ETH</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Deposit Paid:</span>
                    <span className="font-medium">{details.securityDepositPaid ? 'Yes' : 'No'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4 py-4">
            <Card>
              <CardHeader className="bg-primary/10 py-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Wallet className="h-4 w-4 mr-2" /> Monthly Rent
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Amount</span>
                    <span>{details.rentAmount} ETH</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Payment Interval</span>
                    <span>Monthly</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Current Month</span>
                    <span>{details.currentMonth} of {details.rentDuration}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Next Payment</span>
                    <span>{details.nextPaymentDate?.toLocaleDateString() || 'Not scheduled'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Status</span>
                    <Badge variant="outline" className={details.currentRentPaid ? 
                      "bg-green-100 text-green-800 border-green-200" : 
                      "bg-amber-100 text-amber-800 border-amber-200"}>
                      {details.currentRentPaid ? "Paid" : "Due"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-primary/10 py-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Shield className="h-4 w-4 mr-2" /> Security Deposit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Initial Amount</span>
                    <span>{details.securityDeposit} ETH</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Current Amount</span>
                    <span>{details.currentSecurityDeposit} ETH</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Status</span>
                    <Badge variant="outline" className={details.securityDepositPaid ? 
                      "bg-green-100 text-green-800 border-green-200" : 
                      "bg-amber-100 text-amber-800 border-amber-200"}>
                      {details.securityDepositPaid ? "Paid" : "Not Paid"}
                    </Badge>
                  </div>
                  {details.securityDepositPaid && details.securityDepositPaymentDate && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="font-medium">Payment Date</span>
                        <span>{details.securityDepositPaymentDate.toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RentalAgreementDetails; 