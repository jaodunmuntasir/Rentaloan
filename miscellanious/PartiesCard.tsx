import React from 'react';
import { User } from 'lucide-react';
import { Separator } from '../../ui/separator';

interface PartiesCardProps {
  borrower: string;
  borrowerName: string;
  lender: string;
  lenderName: string;
  isUserBorrower: boolean;
  isUserLender: boolean;
  formatAddress: (address: string) => string;
}

const PartiesCard: React.FC<PartiesCardProps> = ({
  borrower,
  borrowerName,
  lender,
  lenderName,
  isUserBorrower,
  isUserLender,
  formatAddress
}) => {
  return (
    <div className="rounded-lg bg-muted p-4">
      <h3 className="font-medium flex items-center mb-3">
        <User className="h-4 w-4 mr-2 text-muted-foreground" /> Parties
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Borrower:</span>
          <span className="font-medium">
            {borrowerName}
            {isUserBorrower && ' (You)'}
          </span>
        </div>
        <div className="text-sm text-right text-muted-foreground">
          {formatAddress(borrower)}
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lender:</span>
          <span className="font-medium">
            {lenderName}
            {isUserLender && ' (You)'}
          </span>
        </div>
        <div className="text-sm text-right text-muted-foreground">
          {formatAddress(lender)}
        </div>
      </div>
    </div>
  );
};

export default PartiesCard; 