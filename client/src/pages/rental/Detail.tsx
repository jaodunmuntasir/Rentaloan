import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import RentalAgreementDetails from '../../components/rental/RentalAgreementDetails';
import PaySecurityDeposit from '../../components/rental/PaySecurityDeposit';
import PayRent from '../../components/rental/PayRent';
import SkipRent from '../../components/rental/SkipRent';
import ExtendAgreement from '../../components/rental/ExtendAgreement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { useLoanAgreement } from '../../hooks/useLoanAgreement';
import { Button } from '../../components/ui/button';
import { ChevronLeft, HomeIcon, ShieldCheck, Coins, Calendar, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const RentalDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [activeTab, setActiveTab] = useState('details');
  
  // For demo purposes, let's assume this rental agreement is associated with a loan
  // In a real app, you would fetch this association from your backend or blockchain
  const demoLoanAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  
  // Handle refresh of data when actions are completed
  const handleActionSuccess = () => {
    // This could trigger a refresh of the data
    console.log("Action completed successfully");
    // We could reset the active tab to details
    setActiveTab('details');
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rental Agreement</h1>
          <p className="text-muted-foreground">
            Contract: {address.substring(0, 6)}...{address.substring(address.length - 4)}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <HomeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
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
          <TabsTrigger value="extend" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Extend</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <RentalAgreementDetails contractAddress={address} />
        </TabsContent>
        
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