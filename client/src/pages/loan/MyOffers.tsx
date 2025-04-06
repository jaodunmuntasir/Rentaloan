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
  RefreshCw,
  DollarSign,
  XCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { useToast } from '../../contexts/ToastContext';

// Types
interface LoanOffer {
  id: string;
  loanRequestId: string;
  loanRequest?: {
    id: string;
    amount: string;
    duration: number;
    interestRate: number;
    status: string;
    rentalAgreement?: {
      contractAddress: string;
      name?: string;
    };
    requester?: {
      id: string;
      email: string;
      walletAddress: string;
    };
  };
  interestRate: number;
  amount: string;
  duration: number;
  status: string;
  createdAt: string;
}

const MyOffersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loanOffers, setLoanOffers] = useState<LoanOffer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'interestRate'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  
  // Load loan offers
  useEffect(() => {
    const fetchMyLoanOffers = async () => {
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
        
        // Fetch loan offers from API
        const response = await LoanApi.getMyLoanOffers(appUser);
        console.log('Response from getMyLoanOffers:', response);
        
        if (response && response.loanOffers) {
          console.log('My loan offers:', response.loanOffers);
          setLoanOffers(response.loanOffers);
        } else {
          console.warn('No loan offers data available for the user');
          setLoanOffers([]);
        }
      } catch (err) {
        console.error("Error fetching loan offers:", err);
        setError('Failed to load your loan offers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyLoanOffers();
  }, [currentUser]);
  
  // Filter and sort loan offers
  const filteredAndSortedOffers = loanOffers
    .filter(offer => {
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          offer.loanRequest?.rentalAgreement?.name?.toLowerCase().includes(searchLower) ||
          offer.loanRequest?.rentalAgreement?.contractAddress.toLowerCase().includes(searchLower) ||
          offer.amount.includes(searchTerm) ||
          offer.loanRequest?.requester?.email.toLowerCase().includes(searchLower)
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
      
      if (sortBy === 'interestRate') {
        return sortOrder === 'asc'
          ? a.interestRate - b.interestRate
          : b.interestRate - a.interestRate;
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
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'WITHDRAWN':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Withdrawn</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Handle withdraw offer
  const handleWithdrawOffer = async (offerId: string) => {
    if (!currentUser) return;

    try {
      setProcessingAction(`withdrawing-${offerId}`);

      // Convert Firebase User to App User
      const appUser = {
        id: currentUser.uid,
        email: currentUser.email || "",
        name: currentUser.displayName || "",
        walletAddress: null,
        token: await currentUser.getIdToken(),
      };

      // Withdraw offer via API
      const response = await LoanApi.withdrawLoanOffer(appUser, offerId);

      if (response && response.success) {
        showToast("Loan offer withdrawn successfully!", "success");

        // Update offers list by removing the withdrawn offer
        setLoanOffers(loanOffers.map(offer => 
          offer.id === offerId 
            ? { ...offer, status: 'WITHDRAWN' } 
            : offer
        ));
      } else {
        showToast("Failed to withdraw loan offer", "error");
      }
    } catch (err) {
      console.error("Error withdrawing loan offer:", err);
      showToast("Failed to withdraw loan offer", "error");
    } finally {
      setProcessingAction(null);
    }
  };
  
  // Calculate monthly payment
  const calculateMonthlyPayment = (
    amount: string,
    interestRate: number,
    duration: number
  ): string => {
    const principal = parseFloat(amount);
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = duration;
    
    if (principal <= 0 || interestRate <= 0 || numberOfPayments <= 0) {
      return "0";
    }
    
    // Monthly payment formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const payment = 
      (principal *
        monthlyInterestRate * 
        Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    return payment.toFixed(6);
  };
  
  // Render loan offer card
  const renderLoanOfferCard = (offer: LoanOffer) => {
    // Handle various possible data structures
    const contractAddress = offer.loanRequest?.rentalAgreement?.contractAddress || 'Unknown';
    const propertyName = offer.loanRequest?.rentalAgreement?.name || `Rental Agreement`;
    const requestId = offer.loanRequest?.id || offer.loanRequestId;
    const borrowerEmail = offer.loanRequest?.requester?.email || 'Unknown';
    
    // Format the creation date
    let createdDate = 'Unknown date';
    try {
      createdDate = formatTimeFromNow(offer.createdAt);
    } catch (err) {
      console.error('Error formatting date:', err);
    }
    
    return (
      <Card key={offer.id} className="mb-4 hover:border-primary transition-colors">
        <Link to={`/rental/${contractAddress}/loan/request/${requestId}`} className="block">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">
                  {propertyName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Borrower: {borrowerEmail}
                </p>
              </div>
              
              <div className="mt-2 md:mt-0">
                {getStatusBadge(offer.status)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Your Offer Amount</p>
                <p className="font-semibold">{offer.amount} ETH</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="font-semibold">{offer.interestRate}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold">{offer.duration} months</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Monthly Payment</p>
                <p className="font-semibold">
                  {calculateMonthlyPayment(
                    offer.amount,
                    offer.interestRate,
                    offer.duration
                  )} ETH
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-muted-foreground">
                Offered {createdDate}
              </span>
              {offer.status === 'PENDING' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent navigation
                    handleWithdrawOffer(offer.id);
                  }}
                  disabled={processingAction !== null}
                >
                  {processingAction === `withdrawing-${offer.id}` ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Withdraw Offer
                    </>
                  )}
                </Button>
              )}
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
        
        const response = await LoanApi.getMyLoanOffers(appUser);
        if (response && response.loanOffers) {
          setLoanOffers(response.loanOffers);
        }
      } catch (err) {
        console.error("Error retrying fetch:", err);
        setError('Failed to load your loan offers. Please try again.');
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
          <h1 className="text-3xl font-bold tracking-tight">My Loan Offers</h1>
          <p className="text-muted-foreground">
            View and manage your loan offers
          </p>
        </div>
        
        <Button onClick={() => navigate('/loan/requests')}>
          <DollarSign className="mr-2 h-4 w-4" /> Browse Loan Requests
        </Button>
      </div>
      
      <div className="grid gap-6">
        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by property or borrower..."
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
              onClick={() => toggleSort('interestRate')}
              className="flex-1 sm:flex-none"
            >
              Rate
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your loan offers...</p>
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
        ) : filteredAndSortedOffers.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Loan Offers Found</h3>
            <p className="text-muted-foreground mt-2">
              You haven't made any loan offers yet.
            </p>
            <Button 
              onClick={() => navigate('/loan/requests')} 
              className="mt-6"
            >
              <DollarSign className="mr-2 h-4 w-4" /> Browse Loan Requests
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedOffers.map(renderLoanOfferCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOffersPage; 