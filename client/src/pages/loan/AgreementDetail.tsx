import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoanApi } from '../../services/api.service';
import { BlockchainService, LoanAgreementDetails, LoanAgreementStatus } from '../../services/blockchain.service';
import PayLoan from '../../components/loan/PayLoan';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
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
  FileText,
  ArrowLeft,
  AlertTriangle,
  Wallet
} from 'lucide-react';

interface Payment {
  date: Date;
  amount: string;
  status: 'pending' | 'paid' | 'missed' | 'future';
}

interface LoanAgreementData {
  id: string;
  contractAddress: string;
  borrowerId: number;
  lenderId: number;
  amount: string;
  interestRate: number;
  duration: number;
  graceMonths: number;
  status: string;
  startDate: Date;
  borrower?: {
    id: number;
    email: string;
    walletAddress: string;
  };
  lender?: {
    id: number;
    email: string;
    walletAddress: string;
  };
  loanRequest?: {
    id: number;
    amount: string;
    duration: number;
  };
  loanOffer?: {
    id: number;
    amount: string;
    interestRate: number;
  };
  rentalAgreement?: {
    id: number;
    contractAddress: string;
    name: string;
  };
}

const LoanAgreementDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dbAgreement, setDbAgreement] = useState<LoanAgreementData | null>(null);
  const [blockchainAgreement, setBlockchainAgreement] = useState<LoanAgreementDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  
  // Fetch agreement details from database and blockchain
  useEffect(() => {
    const fetchAgreementDetails = async () => {
      if (!address) {
        setError('Loan agreement address is required');
        setLoading(false);
        return;
      }
      
      if (!currentUser) {
        setError('You must be logged in to view this page');
        setLoading(false);
        return;
      }
      
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
        
        // Fetch data from our database
        const dbResponse = await LoanApi.getLoanAgreement(appUser, address);
        
        if (!dbResponse || !dbResponse.loanAgreement) {
          throw new Error('Failed to fetch loan agreement from database');
        }
        
        setDbAgreement(dbResponse.loanAgreement);
        
        // Fetch data from blockchain
        try {
          const blockchainData = await BlockchainService.getLoanAgreementDetails(address);
          setBlockchainAgreement(blockchainData);
          
          // Generate payment schedule based on blockchain data
          const generatedPayments: Payment[] = [];
          const startDate = dbResponse.loanAgreement.startDate ? new Date(dbResponse.loanAgreement.startDate) : new Date();
          
          for (let i = 0; i < blockchainData.duration; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + i + 1);
            
            const monthNumber = i + 1;
            const isPaid = monthNumber <= blockchainData.lastPaidMonth;
            const isCurrent = monthNumber === blockchainData.lastPaidMonth + 1;
            const isFuture = monthNumber > blockchainData.lastPaidMonth + 1;
            
            let status: 'paid' | 'pending' | 'missed' | 'future' = 'future';
            if (isPaid) {
              status = 'paid';
            } else if (isCurrent) {
              status = 'pending';
            } else if (isFuture) {
              status = 'future';
            }
            
            generatedPayments.push({
              date: paymentDate,
              amount: blockchainData.monthlyPayment,
              status
            });
          }
          
          setPayments(generatedPayments);
        } catch (blockchainError) {
          console.error('Error fetching blockchain data:', blockchainError);
          // We still have DB data, so continue but show a warning
          showToast('Could not fetch real-time data from blockchain', 'warning');
        }
      } catch (err) {
        console.error("Error fetching loan agreement details:", err);
        setError('Failed to load loan agreement details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgreementDetails();
  }, [address, currentUser, showToast]);
  
  // Calculate repayment progress percentage
  const calculateProgress = (): number => {
    if (!blockchainAgreement) return 0;
    
    const paidAmount = blockchainAgreement.lastPaidMonth * parseFloat(blockchainAgreement.monthlyPayment);
    const totalAmount = parseFloat(blockchainAgreement.loanAmount) * (1 + (blockchainAgreement.interestRate / 100));
    
    return Math.min(100, Math.round((paidAmount / totalAmount) * 100));
  };
  
  // Format address for display (e.g. 0x1234...5678)
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate days until next payment
  const daysUntilNextPayment = (): number | null => {
    const pendingPayment = payments.find(p => p.status === 'pending');
    if (!pendingPayment) return null;
    
    const now = new Date();
    const dueDate = pendingPayment.date;
    const diffTime = Math.abs(dueDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Get loan status badge
  const getStatusBadge = (status: LoanAgreementStatus | string) => {
    let statusText = '';
    let className = '';
    
    // If it's a string (from DB), convert to enum (from blockchain)
    const statusValue = typeof status === 'string' 
      ? status 
      : Object.keys(LoanAgreementStatus)[status as number];
    
    switch (statusValue) {
      case 'INITIALIZED':
      case String(LoanAgreementStatus.INITIALIZED):
        statusText = 'Initialized';
        className = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        break;
      case 'READY':
      case String(LoanAgreementStatus.READY):
        statusText = 'Ready';
        className = 'bg-blue-100 text-blue-800 border-blue-200';
        break;
      case 'ACTIVE':
      case String(LoanAgreementStatus.ACTIVE):
        statusText = 'Active';
        className = 'bg-green-100 text-green-800 border-green-200';
        break;
      case 'PAID':
      case String(LoanAgreementStatus.PAID):
        statusText = 'Paid';
        className = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        break;
      case 'COMPLETED':
      case String(LoanAgreementStatus.COMPLETED):
        statusText = 'Completed';
        className = 'bg-purple-100 text-purple-800 border-purple-200';
        break;
      case 'DEFAULTED':
      case String(LoanAgreementStatus.DEFAULTED):
        statusText = 'Defaulted';
        className = 'bg-red-100 text-red-800 border-red-200';
        break;
      default:
        statusText = 'Unknown';
        className = 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    return <Badge className={className}>{statusText}</Badge>;
  };
  
  // Get payment status badge
  const getPaymentStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
      case 'missed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Missed</Badge>;
      case 'future':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Upcoming</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Handle payment submission
  const handlePayment = async (month: number, amount: string) => {
    if (!address || !currentUser || !blockchainAgreement) return;
    
    try {
      setProcessingAction('payment');
      
      // Make payment on blockchain
      const txHash = await BlockchainService.makeRepayment(address, month, amount);
      
      // Update backend with payment info
      const appUser = {
        id: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || '',
        walletAddress: null,
        token: await currentUser.getIdToken()
      };
      
      await LoanApi.makeRepayment(appUser, address, month, amount, txHash);
      
      showToast('Payment successful!', 'success');
      
      // Refresh page data
      window.location.reload();
    } catch (err) {
      console.error('Error making loan payment:', err);
      showToast('Failed to make payment', 'error');
    } finally {
      setProcessingAction(null);
    }
  };
  
  // Determine if user is the borrower
  const isUserBorrower = (): boolean => {
    if (!currentUser || !blockchainAgreement) return false;
    return blockchainAgreement.borrower.toLowerCase() === currentUser.uid.toLowerCase();
  };
  
  // Determine if user is the lender
  const isUserLender = (): boolean => {
    if (!currentUser || !blockchainAgreement) return false;
    return blockchainAgreement.lender.toLowerCase() === currentUser.uid.toLowerCase();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-2">Loading loan agreement details...</span>
      </div>
    );
  }
  
  if (error || (!dbAgreement && !blockchainAgreement)) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load loan agreement details</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || "Could not load loan details"}</AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <a href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Use blockchain data first, fallback to database data
  const loanDetails = {
    borrower: blockchainAgreement?.borrower || dbAgreement?.borrower?.walletAddress || '',
    lender: blockchainAgreement?.lender || dbAgreement?.lender?.walletAddress || '',
    loanAmount: blockchainAgreement?.loanAmount || dbAgreement?.amount || '0',
    interestRate: blockchainAgreement?.interestRate || dbAgreement?.interestRate || 0,
    duration: blockchainAgreement?.duration || dbAgreement?.duration || 0,
    installmentAmount: blockchainAgreement?.monthlyPayment || '0',
    status: blockchainAgreement?.status || dbAgreement?.status || 'UNKNOWN',
    startDate: dbAgreement?.startDate ? new Date(dbAgreement.startDate) : new Date(),
    graceMonths: blockchainAgreement?.graceMonths || dbAgreement?.graceMonths || 0,
    rentalAddress: dbAgreement?.rentalAgreement?.contractAddress || '',
    remainingBalance: blockchainAgreement 
      ? (parseFloat(blockchainAgreement.loanAmount) - (blockchainAgreement.lastPaidMonth * parseFloat(blockchainAgreement.monthlyPayment))).toFixed(6)
      : '0'
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loan')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loans
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Loan Agreement {getStatusBadge(loanDetails.status)}
          </h1>
          <p className="text-muted-foreground mt-1">
            Started on {formatDate(loanDetails.startDate)} · ID: {formatAddress(loanDetails.borrower)}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold">{loanDetails.loanAmount} ETH</span>
          <span className="text-muted-foreground">at {loanDetails.interestRate}% interest</span>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
          <TabsTrigger value="pay" disabled={loanDetails.status !== 'ACTIVE' || !isUserBorrower()}>
            Make Payment
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" /> Loan Summary
              </CardTitle>
              <CardDescription>Current status and details of this loan agreement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Repayment Progress</span>
                  <span className="font-medium">{calculateProgress()}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" /> Parties
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Borrower:</span>
                        <span className="font-mono text-sm">
                          {formatAddress(loanDetails.borrower)}
                          {isUserBorrower() && ' (You)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lender:</span>
                        <span className="font-mono text-sm">{formatAddress(loanDetails.lender)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <Home className="h-4 w-4 mr-2 text-muted-foreground" /> Collateral Property
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contract:</span>
                        <span className="font-mono">{formatAddress(loanDetails.rentalAddress)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <Wallet className="h-4 w-4 mr-2 text-muted-foreground" /> Loan Terms
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loan Amount:</span>
                        <span className="font-medium">{loanDetails.loanAmount} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <span className="font-medium">{loanDetails.interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{loanDetails.duration} months</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Payment:</span>
                        <span className="font-medium">{loanDetails.installmentAmount} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Repayment Left:</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {loanDetails.status === 'ACTIVE' && isUserBorrower() && (
                <div className="mt-4">
                  <Button onClick={() => setActiveTab('pay')}>
                    Make Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" /> Recent Payments
              </CardTitle>
              <CardDescription>
                Most recent payment activity for this loan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments
                  .filter(payment => payment.status !== 'future')
                  .slice(0, 3)
                  .map((payment, index) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">{formatDate(payment.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.status === 'paid' ? 'Payment received' : 'Payment due'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{payment.amount} ETH</p>
                        <div className="mt-1">{getPaymentStatusBadge(payment.status)}</div>
                      </div>
                    </div>
                  ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => setActiveTab('schedule')}
                >
                  View Full Payment Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Payment Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" /> Payment Schedule
              </CardTitle>
              <CardDescription>
                Complete payment schedule for the duration of the loan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium">Payment #{index + 1}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(payment.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{payment.amount} ETH</p>
                      <div className="mt-1">{getPaymentStatusBadge(payment.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Make Payment Tab */}
        <TabsContent value="pay" className="space-y-6 mt-6">
          {loanDetails.status !== 'ACTIVE' ? (
            <Alert>
              <AlertTitle>This loan is no longer active</AlertTitle>
              <AlertDescription>
                You cannot make payments on a loan that has been fully repaid or defaulted.
              </AlertDescription>
            </Alert>
          ) : !isUserBorrower() ? (
            <Alert>
              <AlertTitle>Not authorized</AlertTitle>
              <AlertDescription>
                Only the borrower can make payments on this loan.
              </AlertDescription>
            </Alert>
          ) : (
            <PayLoan 
              loanAddress={loanDetails.borrower}
              onSuccess={() => {
                // Handle payment success
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoanAgreementDetail; 