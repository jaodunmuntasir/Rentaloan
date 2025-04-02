import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContracts } from '../../contexts/ContractContext';
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

interface LoanAgreement {
  id: string;
  borrower: string;
  lender: string;
  loanAmount: string;
  interestRate: number;
  loanDuration: number;
  installmentAmount: string;
  nextPaymentDue: Date | null;
  startDate: Date;
  endDate: Date;
  currentPaidAmount: string;
  totalRemainingAmount: string;
  remainingInstallments: number;
  status: 'active' | 'paid' | 'defaulted';
  payments: Payment[];
  graceMonths: number;
  gracePeriodsUsed: number;
  rentalAddress: string;
  propertyAddress: string;
}

const LoanAgreementDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState<LoanAgreement | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Mock data function for demo purposes
  useEffect(() => {
    const fetchAgreementDetails = async () => {
      if (!address) {
        setError('Loan agreement address is required');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // In a real app, this would be fetched from the blockchain
        // Mock data for demo purposes
        const now = new Date();
        const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
        const endDate = new Date(startDate.getTime() + 12 * 30 * 24 * 60 * 60 * 1000); // 12 months from start
        
        const mockAgreement: LoanAgreement = {
          id: address,
          borrower: '0x9876543210987654321098765432109876543210',
          lender: '0x1111111111111111111111111111111111111111',
          loanAmount: '2.5',
          interestRate: 5.5,
          loanDuration: 12,
          installmentAmount: '0.2157',
          nextPaymentDue: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          startDate,
          endDate,
          currentPaidAmount: '0.6471',
          totalRemainingAmount: '1.9413',
          remainingInstallments: 9,
          status: 'active',
          graceMonths: 1,
          gracePeriodsUsed: 0,
          rentalAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          propertyAddress: '123 Main St, New York, NY',
          payments: [
            {
              date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'paid'
            },
            {
              date: new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'paid'
            },
            {
              date: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'paid'
            },
            {
              date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'pending'
            },
            {
              date: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 97 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 127 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 157 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 187 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 217 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            },
            {
              date: new Date(now.getTime() + 247 * 24 * 60 * 60 * 1000),
              amount: '0.2157',
              status: 'future'
            }
          ]
        };
        
        setAgreement(mockAgreement);
      } catch (err) {
        console.error("Error fetching loan agreement details:", err);
        setError('Failed to load loan agreement details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgreementDetails();
  }, [address]);
  
  // Calculate repayment progress percentage
  const calculateProgress = (): number => {
    if (!agreement) return 0;
    
    const paidAmount = parseFloat(agreement.currentPaidAmount);
    const totalAmount = parseFloat(agreement.loanAmount) * (1 + (agreement.interestRate / 100));
    
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
  const calculateDaysUntilPayment = (): number => {
    if (!agreement?.nextPaymentDue) return 0;
    
    const now = new Date();
    const diffTime = agreement.nextPaymentDue.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
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
  
  // Check if the current user is the borrower
  const isUserBorrower = (): boolean => {
    if (!currentUser || !agreement) return false;
    return currentUser.uid === agreement.borrower;
  };
  
  // Update payment status after successful payment
  const handlePaymentSuccess = () => {
    if (!agreement) return;
    
    // Find the pending payment and mark it as paid
    const updatedPayments = agreement.payments.map(payment => {
      if (payment.status === 'pending') {
        return { ...payment, status: 'paid' as const };
      }
      return payment;
    });
    
    // Calculate new paid amount
    const newPaidAmount = (parseFloat(agreement.currentPaidAmount) + parseFloat(agreement.installmentAmount)).toString();
    
    // Calculate new remaining amount
    const newRemainingAmount = (parseFloat(agreement.totalRemainingAmount) - parseFloat(agreement.installmentAmount)).toString();
    
    // Find the next payment due date (first future payment)
    const nextFuturePayment = updatedPayments.find(p => p.status === 'future');
    
    // Update agreement state
    setAgreement({
      ...agreement,
      currentPaidAmount: newPaidAmount,
      totalRemainingAmount: newRemainingAmount,
      remainingInstallments: agreement.remainingInstallments - 1,
      nextPaymentDue: nextFuturePayment?.date || null,
      payments: updatedPayments,
      status: agreement.remainingInstallments <= 1 ? 'paid' : 'active'
    });
    
    // Show the overview tab
    setActiveTab('overview');
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading loan agreement details...</p>
      </div>
    );
  }
  
  if (error || !agreement) {
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || 'Failed to load loan agreement details'}
        </AlertDescription>
      </Alert>
    );
  }
  
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
            Loan Agreement {getStatusBadge(agreement.status)}
          </h1>
          <p className="text-muted-foreground mt-1">
            Started on {formatDate(agreement.startDate)} · ID: {formatAddress(agreement.id)}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold">{agreement.loanAmount} ETH</span>
          <span className="text-muted-foreground">at {agreement.interestRate}% interest</span>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
          <TabsTrigger value="pay" disabled={agreement.status !== 'active' || !isUserBorrower()}>
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
                          {formatAddress(agreement.borrower)}
                          {isUserBorrower() && ' (You)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lender:</span>
                        <span className="font-mono text-sm">{formatAddress(agreement.lender)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium flex items-center mb-3">
                      <Home className="h-4 w-4 mr-2 text-muted-foreground" /> Collateral Property
                    </h3>
                    <div className="space-y-2">
                      <p className="mb-2">{agreement.propertyAddress}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contract:</span>
                        <span className="font-mono">{formatAddress(agreement.rentalAddress)}</span>
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
                        <span className="font-medium">{agreement.loanAmount} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <span className="font-medium">{agreement.interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{agreement.loanDuration} months</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Payment:</span>
                        <span className="font-medium">{agreement.installmentAmount} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Grace Periods:</span>
                        <span className="font-medium">
                          {agreement.gracePeriodsUsed}/{agreement.graceMonths} used
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
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-medium">{formatDate(agreement.startDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date:</span>
                        <span className="font-medium">{formatDate(agreement.endDate)}</span>
                      </div>
                      {agreement.nextPaymentDue && (
                        <>
                          <Separator className="my-1" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Next Payment:</span>
                            <span className="font-medium">{formatDate(agreement.nextPaymentDue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Days Remaining:</span>
                            <span className={`font-medium ${calculateDaysUntilPayment() < 3 ? 'text-amber-500' : ''}`}>
                              {calculateDaysUntilPayment()} days
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {agreement.status === 'active' && isUserBorrower() && (
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
                {agreement.payments
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
                {agreement.payments.map((payment, index) => (
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
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" /> Loan Terms & Conditions
              </CardTitle>
              <CardDescription>
                Detailed terms and conditions of this loan agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-medium mb-2">Payment Terms</h3>
                  <p className="text-sm text-muted-foreground">
                    Payments of {agreement.installmentAmount} ETH are due on the same day each month.
                    The loan has a total duration of {agreement.loanDuration} months with an interest rate of {agreement.interestRate}%.
                  </p>
                </div>
                
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-medium mb-2">Grace Periods</h3>
                  <p className="text-sm text-muted-foreground">
                    This loan includes {agreement.graceMonths} grace period(s), which allow the borrower to skip payments
                    when needed. {agreement.gracePeriodsUsed} out of {agreement.graceMonths} have been used so far.
                  </p>
                </div>
                
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-medium mb-2">Default Conditions</h3>
                  <p className="text-sm text-muted-foreground">
                    Failure to make payments on time may result in default. 
                    In case of default, the lender may have rights to claim the collateral property.
                  </p>
                </div>
                
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-medium mb-2">Collateral</h3>
                  <p className="text-sm text-muted-foreground">
                    This loan is secured by the rental agreement at {agreement.propertyAddress}.
                    The rental contract address is {formatAddress(agreement.rentalAddress)}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Make Payment Tab */}
        <TabsContent value="pay" className="space-y-6 mt-6">
          {agreement.status !== 'active' ? (
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
              loanAddress={agreement.id}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoanAgreementDetail; 