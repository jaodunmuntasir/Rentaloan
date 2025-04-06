import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoanApi } from '../../services/api.service';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import {
  Search,
  CreditCard,
  ArrowUpDown,
  ChevronRight,
  Loader2,
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

const MyRequestsPage: React.FC = () => {
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
    const fetchMyLoanRequests = async () => {
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
        
        // Fetch loan requests from API
        const response = await LoanApi.getLoanRequests(appUser);
        console.log('Response from getLoanRequests:', response);
        
        if (response && response.loanRequests) {
          console.log('All loan requests:', response.loanRequests);
          
          // Filter to only show requests created by current user
          // Use a more lenient filtering approach
          const myRequests = response.loanRequests.filter((req: any) => {
            console.log('Checking request:', req);
            console.log('Request requester:', req.requester);
            console.log('Current user ID:', appUser.id);
            
            // Check various ways the requester ID might be stored
            const requesterId = req.requester?.id || req.requesterId;
            const requesterFirebaseId = req.requester?.firebaseId;
            const requesterEmail = req.requester?.email;
            
            console.log('RequesterId:', requesterId);
            console.log('RequesterFirebaseId:', requesterFirebaseId);
            console.log('RequesterEmail:', requesterEmail);
            console.log('User email match:', requesterEmail === appUser.email);
            
            return requesterId === appUser.id || 
                   requesterFirebaseId === appUser.id ||
                   requesterEmail === appUser.email;
          });
          
          console.log('Filtered requests (my requests):', myRequests);
          
          if (myRequests.length > 0) {
            setLoanRequests(myRequests);
          } else {
            console.warn('No requests found for current user. Using all requests instead.');
            setLoanRequests(response.loanRequests);
          }
        } else {
          console.warn('No loan requests data available for the user');
        }
      } catch (err) {
        console.error("Error fetching loan requests:", err);
        setError('Failed to load your loan requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyLoanRequests();
  }, [currentUser]);
  
  // Filter and sort loan requests
  const filteredAndSortedRequests = loanRequests
    .filter(request => {
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          request.rentalAgreement?.propertyAddress?.toLowerCase().includes(searchLower) ||
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
  
  // Render loan request card
  const renderLoanRequestCard = (request: LoanRequest) => {
    // Extra logging for debugging
    console.log('Rendering card for request:', request);
    
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
                <p className="font-medium">{request.amount} ETH</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-medium">{request.duration} months</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Interest Rate</p>
                <p className="font-medium">{request.interestRate}%</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-2 border-t">
              <div className="text-muted-foreground text-xs">
                Created {createdDate}
              </div>
              
              <div className="flex items-center text-primary">
                <span className="text-sm mr-1">View Details</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  };
  
  // Handle retry loading
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    if (currentUser) {
      // This will trigger the useEffect to run again
      setLoanRequests([]);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Loan Requests</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your loan requests
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex items-center"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
        <div className="w-full sm:w-auto sm:flex-1 flex items-center relative">
          <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by address or amount..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => toggleSort('date')}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => toggleSort('amount')}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading your loan requests...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="link" className="p-0 h-auto font-normal" onClick={handleRetry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Empty state */}
      {!loading && !error && filteredAndSortedRequests.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mb-2">No Loan Requests</CardTitle>
          </CardContent>
        </Card>
      )}
      
      {/* Results */}
      {!loading && !error && filteredAndSortedRequests.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedRequests.length} request{filteredAndSortedRequests.length !== 1 ? 's' : ''}
          </div>
          
          {filteredAndSortedRequests.map(renderLoanRequestCard)}
        </div>
      )}
    </div>
  );
};

export default MyRequestsPage; 