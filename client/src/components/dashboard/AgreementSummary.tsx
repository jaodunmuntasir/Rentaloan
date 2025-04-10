import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { 
  Building, 
  CreditCard, 
  ChevronRight, 
  Clock,
  Check,
  AlertCircle,
  CircleDashed,
  CircleDot,
  PiggyBank
} from 'lucide-react';

// Define interface for agreement type
interface Agreement {
  id: string;
  contractAddress: string;
  status: string;
  userRole: string;
  amount?: string;
  // For rentals
  name?: string;
  baseRent?: string;
  securityDeposit?: string;
  // For loans
  interestRate?: number;
}

interface AgreementSummaryProps {
  rentalAgreements: Agreement[];
  loanAgreements: Agreement[];
}

const AgreementSummary: React.FC<AgreementSummaryProps> = ({
  rentalAgreements,
  loanAgreements
}) => {
  const [activeTab, setActiveTab] = useState('rentals');

  // Format blockchain address
  const formatAddress = (address: string): string => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get status badge based on status string
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'PAID':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <Check className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      case 'READY':
      case 'INITIALIZED':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <CircleDashed className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <Check className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      case 'DEFAULTED':
      case 'CLOSED':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <CircleDot className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle>Your Agreements</CardTitle>
        <CardDescription>Overview of your rental and loan agreements</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="rentals" className="flex items-center">
              <Building className="h-4 w-4 mr-2" /> Rentals
            </TabsTrigger>
            <TabsTrigger value="loans" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" /> Loans
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rentals" className="mt-0">
            {rentalAgreements.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-8">
                <Building className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No rental agreements</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  You don't have any active rental agreements yet.
                </p>
                <Button asChild variant="default">
                  <Link to="/rental/create">
                    Create Rental
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentalAgreements.slice(0, 5).map((agreement) => (
                      <TableRow key={agreement.id || agreement.contractAddress}>
                        <TableCell>
                          <div className="font-medium">
                            {agreement.name || 'Rental Property'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAddress(agreement.contractAddress)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {agreement.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agreement.baseRent || '0'} ETH
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(agreement.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/rental/${agreement.contractAddress}`}>
                              <span className="sr-only">View details</span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rentalAgreements.length > 5 && (
                  <div className="flex justify-center p-2 border-t">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/rentals">View all {rentalAgreements.length} rentals</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="loans" className="mt-0">
            {loanAgreements.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-8">
                <PiggyBank className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No loan agreements</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  You don't have any active loan agreements yet.
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="default">
                    <Link to="/loan/request/create">
                      Request Loan
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/loan/requests">
                      Browse Requests
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanAgreements.slice(0, 5).map((agreement) => (
                      <TableRow key={agreement.id || agreement.contractAddress}>
                        <TableCell>
                          <div className="font-medium">
                            {formatAddress(agreement.contractAddress)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {agreement.interestRate ? `${agreement.interestRate}% interest` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {agreement.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agreement.amount || '0'} ETH
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(agreement.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/loan/agreement/${agreement.contractAddress}`}>
                              <span className="sr-only">View details</span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {loanAgreements.length > 5 && (
                  <div className="flex justify-center p-2 border-t">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/loans">View all {loanAgreements.length} loans</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AgreementSummary; 