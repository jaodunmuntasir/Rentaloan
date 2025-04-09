import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import { useLoanAgreement } from '../../hooks/useLoanAgreement';
import { LoanStatus, LoanStatusLabels } from '../../services/loan-agreement.service';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { InfoCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

// Import custom components
import StatusBanner from '../../components/loan/agreement/StatusBanner';
import LoanDetailsPanel from '../../components/loan/agreement/LoanDetailsPanel';
import ActionPanel from '../../components/loan/agreement/ActionPanel';
import RepaymentSchedule from '../../components/loan/agreement/RepaymentSchedule';
import LoanSummary from '../../components/loan/agreement/LoanSummary';
import TransactionHistory from '../../components/loan/agreement/TransactionHistory';

const AgreementDetail = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState('details');

  // Use our loan agreement hook
  const {
    details,
    loading,
    error,
    isBorrower,
    isLender,
    fundingState,
    repaymentState,
    fundLoan,
    makeRepayment,
    getLoanSummary,
    getAvailableActions,
    refreshData
  } = useLoanAgreement(address);

  // Calculate available actions
  const availableActions = getAvailableActions();
  
  // Calculate loan summary
  const loanSummary = getLoanSummary();
  
  // Handle wallet connection status
  useEffect(() => {
    if (!isConnected) {
      // If wallet is not connected, show message or redirect
      console.log('Wallet not connected');
    }
  }, [isConnected]);

  // Redirect if address is invalid
  useEffect(() => {
    if (!address) {
      navigate('/loans');
    }
  }, [address, navigate]);

  // Handle loading state
  if (loading && !details) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Loan Agreement</h1>
          <Skeleton className="h-6 w-32" />
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (error && !details) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'Failed to load loan agreement details'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/loans')}>
          Back to Loans
        </Button>
      </div>
    );
  }

  // Handle no details state
  if (!details) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="mb-6">
          <InfoCircledIcon className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>
            No loan agreement found at this address
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/loans')}>
          Back to Loans
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with back button and status banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/loans')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold">Loan Agreement</h1>
        </div>
        <StatusBanner status={details.status} />
      </div>

      {/* Transaction alerts */}
      {fundingState.isProcessing && (
        <Alert>
          <InfoCircledIcon className="h-4 w-4" />
          <AlertTitle>Transaction in Progress</AlertTitle>
          <AlertDescription>
            Your loan funding transaction is being processed...
          </AlertDescription>
        </Alert>
      )}

      {repaymentState.isProcessing && (
        <Alert>
          <InfoCircledIcon className="h-4 w-4" />
          <AlertTitle>Transaction in Progress</AlertTitle>
          <AlertDescription>
            Your repayment transaction is being processed...
          </AlertDescription>
        </Alert>
      )}

      {fundingState.error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Transaction Failed</AlertTitle>
          <AlertDescription>
            {fundingState.error}
          </AlertDescription>
        </Alert>
      )}

      {repaymentState.error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Transaction Failed</AlertTitle>
          <AlertDescription>
            {repaymentState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loan contract address */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Contract Address: <span className="font-mono">{address}</span>
          </div>
          <div className="flex items-center gap-2">
            {isBorrower && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Borrower</span>}
            {isLender && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Lender</span>}
            {!isBorrower && !isLender && <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Viewer</span>}
          </div>
        </div>
      </Card>

      {/* Action Panel - Only show if user is borrower or lender */}
      {(isBorrower || isLender) && availableActions.length > 0 && (
        <ActionPanel 
          actions={availableActions}
          isBorrower={isBorrower}
          isLender={isLender}
          status={details.status}
        />
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="repayments">Repayments</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <LoanDetailsPanel 
            details={details}
            isBorrower={isBorrower}
            isLender={isLender}
          />
        </TabsContent>
        
        {/* Repayments Tab */}
        <TabsContent value="repayments" className="space-y-4">
          <RepaymentSchedule 
            repaymentSchedule={details.repaymentSchedule}
            lastPaidMonth={details.lastPaidMonth}
            onMakePayment={makeRepayment}
            isProcessing={repaymentState.isProcessing}
            isBorrower={isBorrower}
          />
        </TabsContent>
        
        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          {loanSummary && (
            <LoanSummary 
              summary={loanSummary}
              interestRate={details.interestRate}
              duration={details.duration}
            />
          )}
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <TransactionHistory 
            loanAddress={address || ''}
            borrower={details.borrower}
            lender={details.lender}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgreementDetail;
