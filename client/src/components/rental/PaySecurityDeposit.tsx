import React, { useState } from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Loader2, Shield, Info, Check, AlertTriangle } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PaySecurityDepositProps {
  contractAddress: string;
  onSuccess?: () => void;
}

const PaySecurityDeposit: React.FC<PaySecurityDepositProps> = ({
  contractAddress,
  onSuccess
}) => {
  const { details, loading, error, paySecurityDeposit } = useRentalAgreement(contractAddress);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Handle payment
  const handlePaySecurityDeposit = async () => {
    if (!contractAddress) return;
    
    try {
      setIsProcessing(true);
      const receipt = await paySecurityDeposit();
      
      if (receipt && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error paying security deposit:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // If loading details
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Security Deposit</CardTitle>
          <CardDescription>Loading rental details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // If error or no details
  if (error || !details) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Security Deposit</CardTitle>
          <CardDescription className="text-destructive">
            {error || "Failed to load rental details"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // If security deposit already paid
  if (details.securityDepositPaid) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            Security Deposit
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
              <Check className="h-3 w-3 mr-1" /> Paid
            </Badge>
          </CardTitle>
          <CardDescription>
            Your security deposit has been paid and is held in the smart contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Deposit Successfully Paid</AlertTitle>
            <AlertDescription>
              You have paid a security deposit of {details.securityDeposit} ETH. 
              This amount will be returned to you at the end of your lease, subject to the terms of your rental agreement.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          Security Deposit
          <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Required
          </Badge>
        </CardTitle>
        <CardDescription>
          A security deposit is required before you can move in. This is held in the smart contract.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-4 p-4 rounded-lg bg-muted">
          <Shield className="h-10 w-10 text-primary flex-shrink-0 mt-1" />
          <div className="space-y-2">
            <h4 className="font-medium">Why a security deposit?</h4>
            <p className="text-sm text-muted-foreground">
              The security deposit protects the landlord against damages beyond normal wear and tear. 
              It's stored securely in the rental agreement smart contract and will be returned to you 
              at the end of your lease, assuming no damages.
            </p>
            <div className="rounded-md overflow-hidden border">
              <div className="bg-primary/10 px-4 py-2 border-b">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Deposit Progress</span>
                  <span className="text-xs">
                    {details.securityDepositPaid ? "100%" : "0%"}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <Progress
                  value={details.securityDepositPaid ? 100 : 0}
                  className="h-2 mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 ETH</span>
                  <span>{details.securityDeposit} ETH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertTitle>Important Information</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              You'll need to pay a one-time security deposit of <strong>{details.securityDeposit} ETH</strong> to activate your rental agreement.
            </p>
            <p className="text-sm text-muted-foreground">
              The security deposit will be held in the smart contract for the duration of your rental period 
              and will be returned to you when you move out, provided there are no damages beyond normal wear and tear.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  className="w-full"
                  disabled={isProcessing || details.securityDepositPaid}
                  onClick={handlePaySecurityDeposit}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay Security Deposit (${details.securityDeposit} ETH)`
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>This will initiate a blockchain transaction to pay your security deposit</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
};

export default PaySecurityDeposit; 