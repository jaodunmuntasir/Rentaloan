import React from 'react';
import { Home } from 'lucide-react';

interface CollateralPropertyCardProps {
  rentalAddress: string;
  collateralAmount: string;
  formatAddress: (address: string) => string;
}

const CollateralPropertyCard: React.FC<CollateralPropertyCardProps> = ({
  rentalAddress,
  collateralAmount,
  formatAddress
}) => {
  return (
    <div className="rounded-lg bg-muted p-4">
      <h3 className="font-medium flex items-center mb-3">
        <Home className="h-4 w-4 mr-2 text-muted-foreground" /> Collateral Property
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Rental Contract:</span>
          <span className="font-medium font-mono">{formatAddress(rentalAddress)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Collateral Amount:</span>
          <span className="font-medium">{collateralAmount} ETH</span>
        </div>
      </div>
    </div>
  );
};

export default CollateralPropertyCard; 