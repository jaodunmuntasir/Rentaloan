import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
import CreateLoanOffer from '../../components/loan/CreateLoanOffer';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { 
  Loader2, 
  Home, 
  User, 
  Calendar, 
  Clock, 
  CreditCard, 
  GanttChart,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { ethers } from 'ethers';

// Types
interface LoanOffer {
  id: string;
  lender: string;
  interestRate: number;
  duration: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface LoanRequest {
  id: string;
  address: string;
  borrower: string;
  rentalAddress: string;
  propertyAddress: string;
  loanAmount: string;
  interestRate: number;
  loanDuration: number;
  graceMonths: number;
  status: 'open' | 'funded' | 'repaying' | 'closed' | 'defaulted';
  createdAt: Date;
  offers: LoanOffer[];
}

const LoanRequestDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { loanFactory } = useContracts();
  
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [loanRequest, setLoanRequest] = useState<LoanRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Mock data function for demo purposes
  useEffect(() => {
    const fetchLoanRequest = async () => {
      if (!address) {
        setError('Loan request address is required');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // In a real app, this would be fetched from the blockchain
        // Mock data for demo purposes
        const mockLoanRequest: LoanRequest = {
          id: '1',
          address: address,
          borrower: '0x9876543210987654321098765432109876543210',
          rentalAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          propertyAddress: '123 Main St, New York, NY',
          loanAmount: '2.5',
          interestRate: 5.5,
          loanDuration: 12,
          graceMonths: 1,
          status: 'open',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          offers: [
            {
              id: 'offer1',
              lender: '0x1111111111111111111111111111111111111111',
              interestRate: 4.75,
              duration: 12,
              status: 'pending',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
              id: 'offer2',
              lender: '0x2222222222222222222222222222222222222222',
              interestRate: 5.0,
              duration: 15,
              status: 'pending',
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            }
          ]
        };
        
        setLoanRequest(mockLoanRequest);
      } catch (err) {
        console.error("Error fetching loan request:", err);
        setError('Failed to load loan request details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoanRequest();
  }, [address]);
  
  // Calculate monthly payment for a given interest rate and duration
  const calculateMonthlyPayment = (amount: string, interestRate: number, duration: number): string => {
    const principal = parseFloat(amount);
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = duration;
    
    if (principal <= 0 || interestRate <= 0 || numberOfPayments <= 0) {
      return '0';
    }
    
    // Monthly payment formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const payment = 
      principal * 
      monthlyInterestRate * 
      Math.pow(1 + monthlyInterestRate, numberOfPayments) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    return payment.toFixed(6);
  };
  
  // Format address for display (e.g. 0x1234...5678)
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
  
  // Handle offer submission
  const handleOfferSubmit = async (interestRate: number, duration: number) => {
    // In a real app, this would call a blockchain transaction
    console.log('Submitting offer:', { interestRate, duration });
    
    // Simulate waiting for transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Refresh offers
    if (loanRequest) {
      const newOffer: LoanOffer = {
        id: `offer${loanRequest.offers.length + 1}`,
        lender: currentUser?.uid || '0x0000000000000000000000000000000000000000',
        interestRate,
        duration,
        status: 'pending',
        createdAt: new Date()
      };
      
      setLoanRequest({
        ...loanRequest,
        offers: [...loanRequest.offers, newOffer]
      });
      
      // Switch to offers tab to show the new offer
      setActiveTab('offers');
    }
  };
  
  // Check if current user is the borrower
  const isUserBorrower = (): boolean => {
    if (!currentUser || !loanRequest) return false;
    return currentUser.uid === loanRequest.borrower;
  };
  
  // Handle accept offer
  const handleAcceptOffer = async (offerId: string) => {
    if (!loanRequest) return;
    
    // In a real app, this would call a blockchain transaction
    console.log('Accepting offer:', offerId);
    
    // Simulate waiting for transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update offers
    const updatedOffers = loanRequest.offers.map(offer => {
      if (offer.id === offerId) {
        return { ...offer, status: 'accepted' as const };
      } else {
        return { ...offer, status: 'rejected' as const };
      }
    });
    
    // Update loan request
    setLoanRequest({
      ...loanRequest,
      status: 'funded',
      offers: updatedOffers
    });
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading loan request details...</p>
      </div>
    );
  }
  
  if (error || !loanRequest) {
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || 'Failed to load loan request details'}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loan/request')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loan Requests
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Loan Request {getStatusBadge(loanRequest.status)}
          </h1>
          <p className="text-muted-foreground mt-1">
            Posted {formatTimeFromNow(loanRequest.createdAt)} · ID: {formatAddress(loanRequest.address)}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold">{loanRequest.loanAmount} ETH</span>
          <span className="text-muted-foreground">Preferred rate: {loanRequest.interestRate}%</span>
        </div>
      </div>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="details">Loan Details</TabsTrigger>
          <TabsTrigger value="offers">
            Offers ({loanRequest.offers.length})
          </TabsTrigger>
          <TabsTrigger value="makeOffer" disabled={loanRequest.status !== 'open' || isUserBorrower()}>
            Make an Offer
          </TabsTrigger>
        </TabsList>
        
        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" /> Loan Request Details
              </CardTitle>
              <CardDescription>Information about this loan request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" /> Borrower
                    </h3>
                    <p className="font-mono text-sm">{formatAddress(loanRequest.borrower)}</p>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <Home className="h-4 w-4 mr-2 text-muted-foreground" /> Rental Property
                    </h3>
                    <p className="mb-2">{loanRequest.propertyAddress}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contract:</span>
                      <span className="font-mono">{formatAddress(loanRequest.rentalAddress)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" /> Loan Terms
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loan Amount:</span>
                        <span className="font-medium">{loanRequest.loanAmount} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preferred Interest:</span>
                        <span className="font-medium">{loanRequest.interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requested Duration:</span>
                        <span className="font-medium">{loanRequest.loanDuration} months</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Grace Periods:</span>
                        <span className="font-medium">{loanRequest.graceMonths} month{loanRequest.graceMonths !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Monthly Payment:</span>
                        <span className="font-medium">
                          {calculateMonthlyPayment(
                            loanRequest.loanAmount, 
                            loanRequest.interestRate,
                            loanRequest.loanDuration
                          )} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" /> Status & Timing
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Status:</span>
                        <span>{getStatusBadge(loanRequest.status)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium">{loanRequest.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Offer Count:</span>
                        <span className="font-medium">{loanRequest.offers.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GanttChart className="h-5 w-5 mr-2" /> Loan Offers
              </CardTitle>
              <CardDescription>
                {loanRequest.offers.length === 0 
                  ? 'No offers have been made for this loan request yet' 
                  : `${loanRequest.offers.length} offer${loanRequest.offers.length !== 1 ? 's' : ''} received`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loanRequest.offers.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  <p>No loan offers yet.</p>
                  {loanRequest.status === 'open' && !isUserBorrower() && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setActiveTab('makeOffer')}
                    >
                      Be the first to make an offer
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {loanRequest.offers.map(offer => (
                    <Card key={offer.id} className={`
                      overflow-hidden border-2
                      ${offer.status === 'accepted' ? 'border-green-500' : ''}
                      ${offer.status === 'rejected' ? 'border-red-200' : ''}
                    `}>
                      <div className="p-4">
                        <div className="flex flex-col md:flex-row justify-between mb-3">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              Offer from {formatAddress(offer.lender)}
                              {offer.status === 'accepted' && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>
                              )}
                              {offer.status === 'rejected' && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
                              )}
                              {offer.status === 'pending' && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Made {formatTimeFromNow(offer.createdAt)}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0 md:text-right">
                            <p className="font-medium">{offer.interestRate}% interest rate</p>
                            <p className="text-sm text-muted-foreground">{offer.duration} month term</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 bg-muted rounded-md px-3 py-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Monthly Payment:</span>
                              <span className="font-medium">
                                {calculateMonthlyPayment(
                                  loanRequest.loanAmount, 
                                  offer.interestRate,
                                  offer.duration
                                )} ETH
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 bg-muted rounded-md px-3 py-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Repayment:</span>
                              <span className="font-medium">
                                {(parseFloat(calculateMonthlyPayment(
                                  loanRequest.loanAmount, 
                                  offer.interestRate,
                                  offer.duration
                                )) * offer.duration).toFixed(6)} ETH
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isUserBorrower() && loanRequest.status === 'open' && offer.status === 'pending' && (
                          <div className="flex justify-end gap-2 mt-3">
                            <Button 
                              variant="default"
                              onClick={() => handleAcceptOffer(offer.id)}
                            >
                              Accept Offer
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Make Offer Tab */}
        <TabsContent value="makeOffer" className="space-y-6 mt-6">
          {loanRequest.status !== 'open' ? (
            <Alert>
              <AlertTitle>This loan request is no longer open</AlertTitle>
              <AlertDescription>
                You cannot make an offer on a loan request that has been funded or closed.
              </AlertDescription>
            </Alert>
          ) : isUserBorrower() ? (
            <Alert>
              <AlertTitle>Cannot make an offer on your own loan request</AlertTitle>
              <AlertDescription>
                You cannot make an offer on a loan request that you created.
              </AlertDescription>
            </Alert>
          ) : (
            <CreateLoanOffer 
              loanRequestAddress={loanRequest.address}
              loanAmount={loanRequest.loanAmount}
              borrowerPreferredRate={loanRequest.interestRate}
              borrowerRequestedDuration={loanRequest.loanDuration}
              onSubmit={handleOfferSubmit}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoanRequestDetail; 