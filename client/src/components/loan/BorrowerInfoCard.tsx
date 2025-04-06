import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { User } from 'lucide-react';

interface BorrowerInfoCardProps {
  borrower: {
    email?: string;
    walletAddress?: string;
  };
  formatAddress: (address: string) => string;
  formatTimeFromNow: (dateString: string) => string;
  requestCreatedAt: string;
}

const BorrowerInfoCard: React.FC<BorrowerInfoCardProps> = ({
  borrower,
  formatAddress,
  formatTimeFromNow,
  requestCreatedAt
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" /> Borrower Information
        </CardTitle>
        <CardDescription>Details of the loan requester</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">
            {borrower?.email || "Unknown"}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Wallet Address</p>
          <p className="text-sm text-muted-foreground">
            {formatAddress(borrower?.walletAddress || "")}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Request Date</p>
          <p className="text-sm text-muted-foreground">
            {new Date(requestCreatedAt).toLocaleDateString()} (
            {formatTimeFromNow(requestCreatedAt)})
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BorrowerInfoCard; 