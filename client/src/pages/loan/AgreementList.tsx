import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Loader2, 
  Search, 
  AlertCircle,
  CreditCard,
  Wallet,
  ExternalLink,
  CheckCircle2,
  Banknote
} from 'lucide-react';

interface LoanAgreement {
  id: string;
  borrower: string;
  lender: string;
  loanAmount: string;
  interestRate: number;
  remainingBalance: string;
  nextPaymentDue: Date | null;
  nextPaymentAmount: string;
  startDate: Date;
  status: 'active' | 'paid' | 'defaulted';
  propertyAddress: string;
}

const LoanAgreementList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'borrower' | 'lender' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<LoanAgreement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be fetched from the blockchain
        // Mock data for demo purposes
        const now = new Date();
        const mockAgreements: LoanAgreement[] = [
          {
            id: '0x1234567890123456789012345678901234567890',
            borrower: '0x9876543210987654321098765432109876543210',
            lender: '0x1111111111111111111111111111111111111111',
            loanAmount: '2.5',
            interestRate: 5.5,
            remainingBalance: '1.9413',
            nextPaymentDue: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            nextPaymentAmount: '0.2157',
            startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            status: 'active',
            propertyAddress: '123 Main St, New York, NY'
          },
          {
            id: '0x2345678901234567890123456789012345678901',
            borrower: '0x9876543210987654321098765432109876543210',
            lender: '0x2222222222222222222222222222222222222222',
            loanAmount: '5.0',
            interestRate: 4.5,
            remainingBalance: '4.3',
            nextPaymentDue: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            nextPaymentAmount: '0.4306',
            startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
            status: 'active',
            propertyAddress: '456 Park Ave, Boston, MA'
          },
          {
            id: '0x3456789012345678901234567890123456789012',
            borrower: '0x3333333333333333333333333333333333333333',
            lender: '0x1111111111111111111111111111111111111111',
            loanAmount: '1.5',
            interestRate: 6.0,
            remainingBalance: '0',
            nextPaymentDue: null,
            nextPaymentAmount: '0',
            startDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
            status: 'paid',
            propertyAddress: '789 Oak St, Chicago, IL'
          },
          {
            id: '0x4567890123456789012345678901234567890123',
            borrower: '0x4444444444444444444444444444444444444444',
            lender: '0x1111111111111111111111111111111111111111',
            loanAmount: '3.0',
            interestRate: 5.0,
            remainingBalance: '2.8',
            nextPaymentDue: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            nextPaymentAmount: '0.2583',
            startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            status: 'defaulted',
            propertyAddress: '321 Pine St, San Francisco, CA'
          }
        ];
        
        setAgreements(mockAgreements);
      } catch (err) {
        console.error("Error fetching loan agreements:", err);
        setError('Failed to load loan agreements');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgreements();
  }, []);
  
  // Format address for display (e.g. 0x1234...5678)
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate days until next payment
  const calculateDaysUntilPayment = (nextPaymentDue: Date | null): string => {
    if (!nextPaymentDue) return 'N/A';
    
    const now = new Date();
    const diffTime = nextPaymentDue.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };
  
  // Get status badge
  const getStatusBadge = (status: LoanAgreement['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'defaulted':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Defaulted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Check if an agreement is past due
  const isPastDue = (agreement: LoanAgreement): boolean => {
    if (!agreement.nextPaymentDue) return false;
    
    const now = new Date();
    return agreement.nextPaymentDue < now;
  };
  
  // Filter agreements based on tab, search, and status filter
  const getFilteredAgreements = () => {
    return agreements
      .filter(agreement => {
        // Filter by tab
        if (activeTab === 'borrower' && currentUser?.uid !== agreement.borrower) return false;
        if (activeTab === 'lender' && currentUser?.uid !== agreement.lender) return false;
        
        // Filter by status
        if (statusFilter !== 'all' && agreement.status !== statusFilter) return false;
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            agreement.id.toLowerCase().includes(query) ||
            agreement.propertyAddress.toLowerCase().includes(query) ||
            agreement.loanAmount.includes(query)
          );
        }
        
        return true;
      });
  };
  
  const filteredAgreements = getFilteredAgreements();
  
  // Navigate to loan agreement detail
  const handleViewAgreement = (id: string) => {
    navigate(`/loan/agreement/${id}`);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading loan agreements...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-destructive h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Loan Agreements</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your loan agreements
          </p>
        </div>
        <Button onClick={() => navigate('/loan/requests')}>
          <Banknote className="mr-2 h-4 w-4" />
          View Loan Requests
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" /> Loan Agreements
          </CardTitle>
          <CardDescription>All your active and completed loan agreements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="all" value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'borrower' | 'lender' | 'all')}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="all">All Agreements</TabsTrigger>
                <TabsTrigger value="borrower">As Borrower</TabsTrigger>
                <TabsTrigger value="lender">As Lender</TabsTrigger>
              </TabsList>
              
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search agreements..."
                    className="pl-8 w-full md:w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="defaulted">Defaulted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="all" className="m-0">
              {filteredAgreements.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No loan agreements found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters to see more results'
                      : 'You don\'t have any loan agreements yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgreements.map((agreement) => (
                    <div 
                      key={agreement.id}
                      className="rounded-lg border p-4 hover:border-primary cursor-pointer transition-colors"
                      onClick={() => handleViewAgreement(agreement.id)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{agreement.propertyAddress}</h3>
                            {getStatusBadge(agreement.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {formatAddress(agreement.id)} • Started: {formatDate(agreement.startDate)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <p className="font-medium">{agreement.loanAmount} ETH</p>
                            <p className="text-sm text-muted-foreground">at {agreement.interestRate}% interest</p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Role</p>
                          <p className="font-medium">
                            {currentUser?.uid === agreement.borrower ? 'Borrower' : 'Lender'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining Balance</p>
                          <p className="font-medium">
                            {agreement.status === 'paid' ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Fully Paid
                              </span>
                            ) : (
                              `${agreement.remainingBalance} ETH`
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Next Payment</p>
                          <p className={`font-medium ${isPastDue(agreement) ? 'text-red-600' : ''}`}>
                            {agreement.status === 'active' 
                              ? `${calculateDaysUntilPayment(agreement.nextPaymentDue)} (${agreement.nextPaymentAmount} ETH)`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="borrower" className="m-0">
              {/* Content is filtered by the filteredAgreements logic */}
            </TabsContent>
            
            <TabsContent value="lender" className="m-0">
              {/* Content is filtered by the filteredAgreements logic */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanAgreementList; 