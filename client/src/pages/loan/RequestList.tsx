import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoanApi } from '../../services/api.service';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  Home,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

// Types
interface LoanRequest {
  id: string;
  rentalAgreementId: string;
  rentalAgreement?: {
    contractAddress: string;
    name?: string;
    propertyAddress?: string;
  };
  amount: string;
  duration: number;
  interestRate: number;
  status: string;
  createdAt: string;
  offersCount?: number;
}

const LoanRequestList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'duration' | 'offers'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Load loan requests
  useEffect(() => {
    const fetchLoanRequests = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Convert Firebase User to App User
        const appUser = {
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          walletAddress: null,
          token: await currentUser.getIdToken()
        };
        
        console.log('Current User:', appUser);
        
        // Fetch loan requests from API - this will exclude the user's own requests
        const response = await LoanApi.getLoanRequests(appUser);
        console.log('Response from getLoanRequests:', response);
        
        if (response && response.loanRequests) {
          console.log('Open loan requests:', response.loanRequests);
          setLoanRequests(response.loanRequests);
        } else {
          console.warn('No loan requests data available');
          setLoanRequests([]);
        }
      } catch (err) {
        console.error("Error fetching loan requests:", err);
        setError('Failed to load loan requests. Please try again.');
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
          request.rentalAgreement?.name?.toLowerCase().includes(searchLower) ||
          request.rentalAgreement?.contractAddress.toLowerCase().includes(searchLower) ||
          request.amount.includes(searchTerm)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by selected criteria
      if (sortBy === 'date') {
        return sortOrder === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      if (sortBy === 'amount') {
        return sortOrder === 'asc'
          ? parseFloat(a.amount) - parseFloat(b.amount)
          : parseFloat(b.amount) - parseFloat(a.amount);
      }
      
      if (sortBy === 'duration') {
        return sortOrder === 'asc'
          ? a.duration - b.duration
          : b.duration - a.duration;
      }
      
      if (sortBy === 'offers') {
        return sortOrder === 'asc'
          ? (a.offersCount || 0) - (b.offersCount || 0)
          : (b.offersCount || 0) - (a.offersCount || 0);
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
  const formatTimeFromNow = (dateString: string) => {
    const date = new Date(dateString);
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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Open</Badge>;
      case 'MATCHED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Matched</Badge>;
      case 'FULFILLED':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Fulfilled</Badge>;
      case 'CLOSED':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Closed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Create a formatted loan request card
  const renderLoanRequestCard = (request: LoanRequest) => {
    // Handle various possible data structures
    const contractAddress = request.rentalAgreement?.contractAddress || 'Unknown';
    const propertyName = request.rentalAgreement?.name || `Rental Agreement #${request.rentalAgreementId}`;
    
    // Format the creation date
    let createdDate = 'Unknown date';
    try {
      createdDate = formatTimeFromNow(request.createdAt);
    } catch (err) {
      console.error('Error formatting date:', err);
    }
    
    return (
      <Card key={request.id} className="mb-4 hover:border-primary transition-colors">
        <Link to={`/rental/${contractAddress}/loan/request/${request.id}`} className="block">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">
                  {propertyName}
                  </h3>
                <p className="text-xs text-muted-foreground">
                  Contract: {formatAddress(contractAddress)}
                </p>
              </div>
              
              <div className="mt-2 md:mt-0">
                {getStatusBadge(request.status)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-muted-foreground text-xs">Amount</p>
                <p className="font-semibold">{request.amount} ETH</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-semibold">{request.duration} months</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Interest Rate</p>
                <p className="font-semibold">{request.interestRate}%</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-muted-foreground">
                Posted {createdDate}
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  };
  
  // Handle retry button click
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Call the effect again
    const fetchData = async () => {
      try {
        const appUser = {
          id: currentUser?.uid || '',
          email: currentUser?.email || '',
          name: currentUser?.displayName || '',
          walletAddress: null,
          token: await currentUser?.getIdToken() || ''
        };
        
        const response = await LoanApi.getLoanRequests(appUser);
        if (response && response.loanRequests) {
          setLoanRequests(response.loanRequests);
        }
      } catch (err) {
        console.error("Error retrying fetch:", err);
        setError('Failed to load loan requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) fetchData();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan Requests</h1>
          <p className="text-muted-foreground">
            Browse open loan requests from borrowers
          </p>
        </div>
        
        <Button onClick={() => navigate('/loan/create')}>
          <Plus className="mr-2 h-4 w-4" /> Create Loan Request
        </Button>
      </div>
      
      <div className="grid gap-6">
        <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
              placeholder="Search by property or address..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
          <div className="flex flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toggleSort('date')}
              className="flex-1 sm:flex-none"
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toggleSort('amount')}
              className="flex-1 sm:flex-none"
            >
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
              <Button
              variant="outline" 
                size="sm"
              onClick={() => toggleSort('duration')}
              className="flex-1 sm:flex-none"
              >
              Duration
              <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        
        <Separator className="my-4" />
        
          {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading loan requests...</p>
            </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col space-y-2">
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={handleRetry} className="w-fit">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Loan Requests Found</h3>
            <p className="text-muted-foreground mt-2">
              There are no open loan requests available at the moment.
            </p>
            </div>
          ) : (
          <div className="grid gap-4">
              {filteredAndSortedRequests.map(renderLoanRequestCard)}
            </div>
          )}
      </div>
    </div>
  );
};

export default LoanRequestList; 