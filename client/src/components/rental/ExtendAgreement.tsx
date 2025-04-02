import React, { useState } from 'react';
import { useRentalAgreement } from '../../hooks/useRentalAgreement';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Toaster } from '../ui/sonner';
import { Loader2 } from 'lucide-react';

interface ExtendAgreementProps {
  contractAddress: string;
  onSuccess?: () => void;
}

const ExtendAgreement: React.FC<ExtendAgreementProps> = ({ 
  contractAddress,
  onSuccess
}) => {
  const { details, loading, error, extendRental } = useRentalAgreement(contractAddress);
  const [additionalMonths, setAdditionalMonths] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Calculate cost
  const calculateCost = () => {
    if (!details) return '0';
    const monthlyRent = parseFloat(details.rentAmount);
    return (monthlyRent * additionalMonths).toFixed(4);
  };
  
  // Handle extension
  const handleExtend = async () => {
    if (!contractAddress || additionalMonths <= 0) return;
    
    try {
      setIsProcessing(true);
      const receipt = await extendRental(additionalMonths);
      
      if (receipt) {
        Toaster({
          title: "Rental period extended!",
          description: `Successfully extended the rental agreement by ${additionalMonths} month${additionalMonths > 1 ? 's' : ''}.`,
          variant: "default",
        });
        
        if (onSuccess) onSuccess();
      } else {
        Toaster({
          title: "Extension failed",
          description: "There was an error extending the rental period. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error extending rental period:", err);
      Toaster({
        title: "Extension failed",
        description: "There was an error extending the rental period. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // If loading details
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Extend Rental Agreement</CardTitle>
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
          <CardTitle>Extend Rental Agreement</CardTitle>
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
        <CardTitle>Extend Rental Agreement</CardTitle>
        <CardDescription>
          Extend the duration of your rental agreement. 
          The current end date is {new Date(details.nextPaymentDate.getTime() + ((details.rentDuration - (details.currentRentPaid ? 1 : 0)) * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="extension-period">Extension Period</Label>
            <span className="text-sm text-muted-foreground">{additionalMonths} month{additionalMonths > 1 ? 's' : ''}</span>
          </div>
          <Slider
            id="extension-period"
            min={1}
            max={12}
            step={1}
            value={[additionalMonths]}
            onValueChange={(value) => setAdditionalMonths(value[0])}
            className="py-4"
          />
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm">Current monthly rent:</span>
            <span className="font-medium">{details.rentAmount} ETH</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm">Extension period:</span>
            <span className="font-medium">{additionalMonths} month{additionalMonths > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total cost:</span>
            <span className="font-bold">{calculateCost()} ETH</span>
          </div>
        </div>
        
        <div>
          <Label htmlFor="new-end-date">New End Date</Label>
          <Input 
            id="new-end-date" 
            readOnly 
            value={new Date(details.nextPaymentDate.getTime() + ((details.rentDuration + additionalMonths - (details.currentRentPaid ? 1 : 0)) * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
            className="bg-muted"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={isProcessing || additionalMonths <= 0}
          onClick={handleExtend}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Extend Rental (${calculateCost()} ETH)`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ExtendAgreement; 