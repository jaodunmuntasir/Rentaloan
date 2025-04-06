import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Filter,
  CreditCard,
  ArrowUpDown,
  ChevronRight,
  Loader2,
  Home
} from 'lucide-react';

// Types
interface LoanRequest {
  id: string;
  address: string;
  borrower: string;
  rentalAddress: string;
  propertyAddress: string;
  loanAmount: string;
  interestRate: number;
  loanDuration: number;
  status: 'open' | 'funded' | 'repaying' | 'closed' | 'defaulted';
  createdAt: Date;
  offerCount: number;
}

const LoanRequestList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'duration' | 'offers'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter by user's own requests
  const [showMyRequestsOnly, setShowMyRequestsOnly] = useState(false);
  
  // Load loan requests
  useEffect(() => {
    const fetchLoanRequests = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be fetched from the blockchain
        // For now, using mock data
        const mockLoanRequests: LoanRequest[] = [
          {
            id: '1',
            address: '0x1234567890123456789012345678901234567890',
            borrower: '0x9876543210987654321098765432109876543210',
            rentalAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            propertyAddress: '123 Main St, New York, NY',
            loanAmount: '2.5',
            interestRate: 5.5,
            loanDuration: 12,
            status: 'open',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            offerCount: 2
          },
          {
            id: '2',
            address: '0x2345678901234567890123456789012345678901',
            borrower: '0x8765432109876543210987654321098765432109',
            rentalAddress: '0xbcdefabcdefabcdefabcdefabcdefabcdefabcde',
            propertyAddress: '456 Park Ave, Chicago, IL',
            loanAmount: '3.2',
            interestRate: 4.75,
            loanDuration: 18,
            status: 'funded',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            offerCount: 5
          },
          {
            id: '3',
            address: '0x3456789012345678901234567890123456789012',
            borrower: currentUser?.uid || '0x0', // Assuming this is the current user
            rentalAddress: '0xcdefabcdefabcdefabcdefabcdefabcdefabcdef',
            propertyAddress: '789 Ocean Blvd, Miami, FL',
            loanAmount: '1.8',
            interestRate: 6.0,
            loanDuration: 9,
            status: 'open',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            offerCount: 0
          },
          {
            id: '4',
            address: '0x4567890123456789012345678901234567890123',
            borrower: '0x6543210987654321098765432109876543210987',
            rentalAddress: '0xdefabcdefabcdefabcdefabcdefabcdefabcdefa',
            propertyAddress: '101 Mountain View, Denver, CO',
            loanAmount: '5.0',
            interestRate: 4.25,
            loanDuration: 24,
            status: 'repaying',
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            offerCount: 3
          },
          {
            id: '5',
            address: '0x5678901234567890123456789012345678901234',
            borrower: '0x5432109876543210987654321098765432109876',
            rentalAddress: '0xefabcdefabcdefabcdefabcdefabcdefabcdefab',
            propertyAddress: '222 Sunset Dr, Los Angeles, CA',
            loanAmount: '7.5',
            interestRate: 5.0,
            loanDuration: 36,
            status: 'defaulted',
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
            offerCount: 1
          }
        ];
        
        setLoanRequests(mockLoanRequests);
      } catch (err) {
        console.error("Error fetching loan requests:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoanRequests();
  }, [currentUser]);
  
  // Filter and sort loan requests
  const filteredAndSortedRequests = loanRequests
    .filter(request => {
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          request.propertyAddress.toLowerCase().includes(searchLower) ||
          request.address.toLowerCase().includes(searchLower) ||
          request.loanAmount.includes(searchTerm)
        );
      }
      return true;
    })
    .filter(request => {
      // Filter by status
      if (statusFilter) {
        return request.status === statusFilter;
      }
      return true;
    })
    .filter(request => {
      // Filter by user's own requests
      if (showMyRequestsOnly) {
        return request.borrower === currentUser?.uid;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by selected criteria
      if (sortBy === 'date') {
        return sortOrder === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime();
      }
      
      if (sortBy === 'amount') {
        return sortOrder === 'asc'
          ? parseFloat(a.loanAmount) - parseFloat(b.loanAmount)
          : parseFloat(b.loanAmount) - parseFloat(a.loanAmount);
      }
      
      if (sortBy === 'duration') {
        return sortOrder === 'asc'
          ? a.loanDuration - b.loanDuration
          : b.loanDuration - a.loanDuration;
      }
      
      if (sortBy === 'offers') {
        return sortOrder === 'asc'
          ? a.offerCount - b.offerCount
          : b.offerCount - a.offerCount;
      }
      
      return 0;
    });
  
  // Toggle sort order
  const toggleSort = (criteria: typeof sortBy) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortOrder('desc');
    }
  };
  
  // Format time from now (e.g. "3 days ago")
  const formatTimeFromNow = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays} days ago`;
    }
  };
  
  // Format address for display (e.g. 0x1234...5678)
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get status badge
  const getStatusBadge = (status: LoanRequest['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Open</Badge>;
      case 'funded':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Funded</Badge>;
      case 'repaying':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Repaying</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Closed</Badge>;
      case 'defaulted':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Defaulted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Create a formatted loan request card
  const renderLoanRequestCard = (request: LoanRequest) => {
    return (
      <Card key={request.id} className="mb-4 hover:border-primary transition-colors">
        <Link to={`/rental/${request.rentalAddress}/loan/request/${request.address}`} className="block">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg flex items-center">
                    {parseFloat(request.loanAmount).toFixed(2)} ETH Loan
                  </h3>
                  {getStatusBadge(request.status)}
                </div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Home className="h-3.5 w-3.5 mr-1" />
                  {request.propertyAddress}
                </p>
              </div>
              <div className="mt-2 md:mt-0 flex flex-col items-end">
                <p className="text-sm text-muted-foreground">
                  Posted {formatTimeFromNow(request.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {formatAddress(request.address)}
                </p>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Interest Rate</p>
                <p className="font-medium">{request.interestRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{request.loanDuration} months</p>
              </div>
              <div>
                <p className="text-muted-foreground">Borrower</p>
                <p className="font-medium font-mono">
                  {formatAddress(request.borrower)}
                  {request.borrower === currentUser?.uid && ' (You)'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Offers</p>
                <p className="font-medium">{request.offerCount}</p>
              </div>
            </div>
            
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm">
                View Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Loan Requests</h1>
          <p className="text-muted-foreground">Browse and manage loan requests</p>
        </div>
        <Button onClick={() => navigate('/loan/request/create')}>
          <Plus className="mr-2 h-4 w-4" /> Create Loan Request
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search loan requests..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {statusFilter ? `Status: ${statusFilter}` : 'All Statuses'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('open')}>
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('funded')}>
                    Funded
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('repaying')}>
                    Repaying
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('closed')}>
                    Closed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('defaulted')}>
                    Defaulted
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort: {sortBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleSort('date')}>
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '(Oldest)' : '(Newest)')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('amount')}>
                    Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '(Lowest)' : '(Highest)')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('duration')}>
                    Duration {sortBy === 'duration' && (sortOrder === 'asc' ? '(Shortest)' : '(Longest)')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('offers')}>
                    Offers {sortBy === 'offers' && (sortOrder === 'asc' ? '(Fewest)' : '(Most)')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant={showMyRequestsOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyRequestsOnly(!showMyRequestsOnly)}
              >
                {showMyRequestsOnly ? "My Requests" : "All Requests"}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading loan requests...</p>
            </div>
          ) : filteredAndSortedRequests.length === 0 ? (
            <div className="text-center py-10">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No loan requests found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter || showMyRequestsOnly
                  ? "Try changing your search or filters"
                  : "No loan requests have been created yet"}
              </p>
              <Button onClick={() => navigate('/loan/request/create')}>
                <Plus className="mr-2 h-4 w-4" /> Create Loan Request
              </Button>
            </div>
          ) : (
            <div>
              {filteredAndSortedRequests.map(renderLoanRequestCard)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanRequestList; 