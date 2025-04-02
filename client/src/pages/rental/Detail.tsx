import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import RentalAgreementDetails from '../../components/rental/RentalAgreementDetails';
import PaySecurityDeposit from '../../components/rental/PaySecurityDeposit';
import PayRent from '../../components/rental/PayRent';
import SkipRent from '../../components/rental/SkipRent';
import ExtendAgreement from '../../components/rental/ExtendAgreement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { useLoanAgreement } from '../../hooks/useLoanAgreement';

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
    return <div>No rental agreement address provided</div>;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rental Agreement</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="security">Security Deposit</TabsTrigger>
          <TabsTrigger value="pay">Pay Rent</TabsTrigger>
          <TabsTrigger value="skip">Skip Rent</TabsTrigger>
          <TabsTrigger value="extend">Extend</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <RentalAgreementDetails contractAddress={address} />
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          <PaySecurityDeposit 
            contractAddress={address} 
            onSuccess={handleActionSuccess}
          />
        </TabsContent>
        
        <TabsContent value="pay" className="mt-6">
          <PayRent 
            contractAddress={address} 
            onSuccess={handleActionSuccess}
          />
        </TabsContent>
        
        <TabsContent value="skip" className="mt-6">
          <SkipRent 
            rentalContractAddress={address} 
            loanContractAddress={demoLoanAddress}
            onSuccess={handleActionSuccess}
          />
        </TabsContent>
        
        <TabsContent value="extend" className="mt-6">
          <ExtendAgreement 
            contractAddress={address} 
            onSuccess={handleActionSuccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RentalDetail; 