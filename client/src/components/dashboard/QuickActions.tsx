import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import {
  Building,
  CircleDollarSign,
  PiggyBank,
  Search,
  FileText,
  ListFilter
} from 'lucide-react';

interface QuickActionsProps {
  walletConnected: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  walletConnected
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks you might want to perform</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button asChild variant="default" size="lg" className="justify-start" disabled={!walletConnected}>
          <Link to="/rental/create">
            <Building className="h-4 w-4 mr-2" />
            Create Rental
          </Link>
        </Button>
        
        <Button asChild variant="secondary" size="lg" className="justify-start" disabled={!walletConnected}>
          <Link to="/loan/request/create">
            <PiggyBank className="h-4 w-4 mr-2" />
            Request Loan
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg" className="justify-start" disabled={!walletConnected}>
          <Link to="/loan/requests">
            <Search className="h-4 w-4 mr-2" />
            Browse Loan Requests
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg" className="justify-start">
          <Link to="/loans">
            <ListFilter className="h-4 w-4 mr-2" />
            View My Loans
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActions; 