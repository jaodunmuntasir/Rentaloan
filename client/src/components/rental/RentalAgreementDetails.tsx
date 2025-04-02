import React from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar, Home, Wallet, Shield, FileText, Loader2 } from 'lucide-react';
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
  rentDuration: number;
  paymentInterval: number;
  nextPaymentDate: Date;
  isActive: boolean;
  securityDepositPaid: boolean;
  currentRentPaid: boolean;
  
  // Additional UI properties
  propertyName?: string;
  propertyType?: string;
  propertySize?: string;
  bedrooms?: string;
  startDate?: Date;
  endDate?: Date;
  currentMonth?: number;
  isTerminated?: boolean;
  isExpired?: boolean;
  earlyTerminationNoticePeriod?: string;
  earlyTerminationFee?: string;
  lateFeePercentage?: string;
  lateFeePeriod?: string;
  extensionNoticePeriod?: string;
  additionalTerms?: string;
  securityDepositPaymentDate?: Date;
  securityDepositRefundableDate?: Date;
}

const RentalAgreementDetails: React.FC<RentalAgreementDetailsProps> = ({
  contractAddress
}) => {
  const { details: contractDetails, loading, error } = useRentalAgreement(contractAddress);
  
  // Create an extended details object with UI-specific properties
  const details = contractDetails ? {
    ...contractDetails,
    propertyName: 'Property', // Default values for UI display
    propertyType: 'Residential',
    propertySize: 'Not specified',
    bedrooms: 'Not specified',
    startDate: contractDetails.nextPaymentDate ? 
      new Date(contractDetails.nextPaymentDate.getTime() - (30 * 24 * 60 * 60 * 1000)) : undefined,
    endDate: contractDetails.nextPaymentDate && contractDetails.rentDuration ? 
      new Date(contractDetails.nextPaymentDate.getTime() + ((contractDetails.rentDuration - 1) * 30 * 24 * 60 * 60 * 1000)) : undefined,
    currentMonth: 1, // Default to first month
    isTerminated: false,
    isExpired: false,
    earlyTerminationNoticePeriod: '30 days',
    earlyTerminationFee: '2 months',
    lateFeePercentage: '5%',
    lateFeePeriod: '7 days',
    extensionNoticePeriod: '30 days',
    additionalTerms: 'No additional terms specified.',
    securityDepositPaymentDate: contractDetails.securityDepositPaid ? new Date() : undefined,
    securityDepositRefundableDate: contractDetails.nextPaymentDate && contractDetails.rentDuration ? 
      new Date(contractDetails.nextPaymentDate.getTime() + (contractDetails.rentDuration * 30 * 24 * 60 * 60 * 1000)) : undefined,
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
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Rental Agreement {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              Contract: {formatAddress(contractAddress)}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-medium">{details.propertyName || 'Property'}</div>
            <CardDescription>{details.propertyAddress || 'Address not specified'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
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
              <Card className="overflow-hidden">
                <CardHeader className="bg-primary/10 py-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Home className="h-4 w-4 mr-2" /> Property
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{details.propertyType || 'Not specified'}</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">{details.propertySize || 'Not specified'}</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Bedrooms:</span>
                    <span className="font-medium">{details.bedrooms || 'Not specified'}</span>
                  </div>
                </CardContent>
              </Card>
              
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
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">{details.endDate?.toLocaleDateString() || 'Not specified'}</span>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{details.rentDuration} months</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
                    <span className="font-medium">Amount</span>
                    <span>{details.securityDeposit} ETH</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Status</span>
                    <Badge variant="outline" className={details.securityDepositPaid ? 
                      "bg-green-100 text-green-800 border-green-200" : 
                      "bg-amber-100 text-amber-800 border-amber-200"}>
                      {details.securityDepositPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Payment Date</span>
                    <span>{details.securityDepositPaymentDate?.toLocaleDateString() || 'Not yet paid'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium">Refundable Date</span>
                    <span>{details.securityDepositRefundableDate?.toLocaleDateString() || 'Not applicable'}</span>
                  </div>
                </div>
                
                {details.securityDepositPaid && details.isActive && (
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <AlertTitle className="text-blue-800">Security Deposit Information</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Your security deposit will be fully refundable at the end of the rental period, 
                      provided there are no damages or outstanding payments.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Terms Tab */}
          <TabsContent value="terms" className="space-y-4 py-4">
            <Card>
              <CardHeader className="bg-primary/10 py-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-2" /> Rental Agreement Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Early Termination</h3>
                    <p className="text-sm text-muted-foreground">
                      Early termination requires {details.earlyTerminationNoticePeriod || '30'} days notice and may result in 
                      forfeiture of the security deposit or a fee equal to {details.earlyTerminationFee || '2'} months' rent.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Late Payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Late payments are subject to a fee of {details.lateFeePercentage || '5'}% of the monthly rent for each 
                      {details.lateFeePeriod || '7'} days the payment is overdue.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Property Maintenance</h3>
                    <p className="text-sm text-muted-foreground">
                      The tenant is responsible for routine maintenance as outlined in the rental agreement. 
                      Major repairs are the responsibility of the landlord.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Extension Conditions</h3>
                    <p className="text-sm text-muted-foreground">
                      The rental agreement may be extended by mutual consent of both parties. 
                      Request for extension must be submitted at least {details.extensionNoticePeriod || '30'} days 
                      before the end of the current term.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Additional Terms</h3>
                    <p className="text-sm text-muted-foreground">
                      {details.additionalTerms || 'No additional terms specified.'}
                    </p>
                  </div>
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