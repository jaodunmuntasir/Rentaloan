import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BlockchainService, LoanAgreementStatus } from '../../services/blockchain.service';
import { useAuth } from '../../contexts/AuthContext';
import { LoanApi } from '../../services/api.service';
import { User } from '../../types/user.types';
import { 
  AgreementHeader,
  LoanSummaryCard,
  PaymentScheduleTab,
  MakePaymentTab,
  FundLoanTab,
  TestFunctionsTab,
  LoadingState,
  ErrorState,
  PaymentStatusBadge
} from '../../components/loan/agreement';

// Types
interface Payment {
  monthNumber: number;
  date: Date;
  amount: string;
  status: 'paid' | 'due' | 'future';
  txHash?: string | null;
}

interface LoanAgreementData {
  id: string;
  contractAddress: string;
  status: string;
  amount: string;
  interestRate: number;
  duration: number;
  graceMonths: number;
  startDate: string;
  borrower: {
    id: string;
    email: string;
    name: string;
    walletAddress: string;
  };
  lender: {
    id: string;
    email: string;
    name: string;
    walletAddress: string;
  };
  loanRequest: {
    id: string;
  rentalAgreement?: {
    contractAddress: string;
    }
  };
}

interface PaymentStatus {
  monthNumber: number;
  isPaid: boolean;
}

// Main component
const LoanAgreementDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  
  // State variables
  const [dbAgreement, setDbAgreement] = useState<LoanAgreementData | null>(null);
  const [blockchainAgreement, setBlockchainAgreement] = useState<any>(null);
  const [rentalContractAddress, setRentalContractAddress] = useState<string>('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contractPaymentStatus, setContractPaymentStatus] = useState<PaymentStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [lastKnownStatus, setLastKnownStatus] = useState<LoanAgreementStatus | null>(null);
  
  // Update server with new contract status when it changes
  const updateServerStatus = async (newStatus: LoanAgreementStatus) => {
    if (!currentUser || !address) return;
    
    try {
      console.log('Updating server with new status:', newStatus);
      // Convert Firebase user to User type
      const userForApi: User = {
        id: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || '',
        walletAddress: null,
        token: await currentUser.getIdToken()
      };
      await LoanApi.updateLoanStatus(userForApi, address, newStatus);
      console.log('Server status updated successfully');
    } catch (err) {
      console.error('Error updating server status:', err);
      showToast('Failed to update server status, but contract status is updated', 'warning');
    }
  };
  
  // Fetch blockchain data periodically
  const fetchBlockchainData = async () => {
    if (!address || !currentUser) return null;
    
    // Use a mounted flag to prevent state updates after unmount
    let isMounted = true;
    
    try {
      // Fetch blockchain data
      const blockchainData = await BlockchainService.getLoanAgreementDetails(address);
      
      // Check if component is still mounted before updating state
      if (!isMounted) return null;
      
      setBlockchainAgreement(blockchainData);
      
      // Check if status has changed and update server if needed
      if (lastKnownStatus !== null && lastKnownStatus !== blockchainData.status) {
        await updateServerStatus(blockchainData.status);
      }
      
      if (!isMounted) return null;
      setLastKnownStatus(blockchainData.status);
      
      // Get rental contract address
      const rentalAddress = await BlockchainService.getRentalContractAddress(address);
      
      if (!isMounted) return null;
      setRentalContractAddress(rentalAddress);
      
      // Get payment status
      const paymentStatusData = await BlockchainService.getPaymentStatus(address);
      
      if (!isMounted) return null;
      
      // Transform into our format
      const statusArray = paymentStatusData.monthNumbers.map((month: number, index: number) => ({
        monthNumber: month,
        isPaid: paymentStatusData.isPaid[index]
      }));
      
      setContractPaymentStatus(statusArray);
      
      // Generate payment schedule from blockchain data
      const schedule: Payment[] = [];
      const startDate = dbAgreement?.startDate ? new Date(dbAgreement.startDate) : new Date();
      
      for (let i = 1; i <= blockchainData.duration; i++) {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        const paymentInfo = statusArray.find(s => s.monthNumber === i);
        const isPaid = paymentInfo ? paymentInfo.isPaid : false;
        const isCurrentOrFuture = i > blockchainData.lastPaidMonth;
        
        schedule.push({
          monthNumber: i,
          date: paymentDate,
          amount: blockchainData.monthlyPayment,
          status: isPaid ? 'paid' : isCurrentOrFuture ? 'future' : 'due',
          txHash: null // We don't store txHash in the blockchain, it would come from API
        });
      }
      
      if (!isMounted) return null;
      setPayments(schedule);
      
      return blockchainData;
      
    } catch (blockchainError) {
      console.error('Error fetching blockchain data:', blockchainError);
      return null;
    } finally {
      // Clean up function to set mounted flag to false on unmount
      return () => {
        isMounted = false;
      };
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!address) {
        setError('Loan agreement address is missing');
        setLoading(false);
        return;
      }
      
      if (!currentUser) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // First try to get blockchain data directly
        const blockchainData = await fetchBlockchainData();
        
        // Convert Firebase user to User type
        const userForApi: User = {
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          walletAddress: null,
          token: await currentUser.getIdToken()
        };
        
        // Fetch agreement data from database for user info using API service
        try {
          // Use axios directly with authorization header to ensure proper authentication
          const response = await axios.get(
            `http://localhost:5000/api/loan/agreement/${address}`,
            {
              headers: {
                'Authorization': `Bearer ${await currentUser.getIdToken()}`
              }
            }
          );
          
          const dbData = response.data.loanAgreement;
          const apiPayments = response.data.payments || [];
          
          setDbAgreement(dbData);
          
          // Update payments with transaction hash info from API
          if (payments.length > 0 && apiPayments.length > 0) {
            const updatedPayments = [...payments];
            
            apiPayments.forEach((apiPayment: any) => {
              const paymentIndex = updatedPayments.findIndex(p => p.monthNumber === apiPayment.month);
              if (paymentIndex !== -1) {
                updatedPayments[paymentIndex].txHash = apiPayment.txHash;
              }
            });
            
            setPayments(updatedPayments);
          }
        } catch (apiError) {
          console.error('Error fetching loan agreement from API:', apiError);
          showToast('Could not fetch agreement details from server', 'warning');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching loan agreement details:', err);
        setError('Failed to load loan agreement details. Please try again.');
        setLoading(false);
      }
    };
    
    fetchInitialData();
    
    // Poll for blockchain updates every 15 seconds
    const intervalId = setInterval(() => {
      if (currentUser) {  // Only fetch if user is logged in
        fetchBlockchainData().catch(console.error);
      }
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [address, currentUser]); // Remove showToast from dependencies to prevent potential rerenders
  
  // Utility functions
  // Calculate repayment progress based on last paid month and total duration
  const calculateProgress = (): number => {
    if (!blockchainAgreement) return 0;
    
    const { lastPaidMonth, duration } = blockchainAgreement;
    if (duration === 0) return 0;
    
    return (lastPaidMonth / duration) * 100;
  };

  // Format blockchain address with ellipsis
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate days until next payment
  const daysUntilNextPayment = (): number => {
    if (!blockchainAgreement || !payments.length) return 0;
    
    const nextPaymentMonth = blockchainAgreement.lastPaidMonth + 1;
    if (nextPaymentMonth > blockchainAgreement.duration) return 0;
    
    const nextPayment = payments.find(p => p.monthNumber === nextPaymentMonth);
    if (!nextPayment) return 0;
    
    const today = new Date();
    const paymentDate = new Date(nextPayment.date);
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  // Check if current user is the borrower
  const isUserBorrower = (): boolean => {
    if (!currentUser || !dbAgreement || !dbAgreement.borrower) return false;
    
    // Check wallet address if available in blockchain data
    if (blockchainAgreement?.borrower) {
      const userWalletAddress = (currentUser as any).walletAddress?.toLowerCase();
      return userWalletAddress === blockchainAgreement.borrower.toLowerCase();
    }
    
    // Fallback to database ID check
    return (currentUser as any).id === dbAgreement.borrower.id;
  };

  // Check if current user is the lender
  const isUserLender = (): boolean => {
    if (!currentUser || !dbAgreement || !dbAgreement.lender) return false;
    
    // Check wallet address if available in blockchain data
    if (blockchainAgreement?.lender) {
      const userWalletAddress = (currentUser as any).walletAddress?.toLowerCase();
      return userWalletAddress === blockchainAgreement.lender.toLowerCase();
    }
    
    // Fallback to database ID check
    return (currentUser as any).id === dbAgreement.lender.id;
  };

  // Action handlers
  // Handle payment submission
  const handlePayment = async (month: number, amount: string) => {
    if (!address || !currentUser) {
      showToast("Contract address not found or user not authenticated", "error");
      return;
    }
    
    try {
      setProcessingAction('payment');
      const txHash = await BlockchainService.makeRepayment(
        address,
        month,
        amount
      );
      
      showToast(`Payment successful! Transaction hash: ${formatAddress(txHash)}`, "success");
      
      // Update blockchain data instead of reloading
      await fetchBlockchainData();
      
      // Also record the payment in the database
      try {
        // Convert Firebase user to User type
        const userForApi: User = {
        id: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || '',
        walletAddress: null,
        token: await currentUser.getIdToken()
      };
        await LoanApi.recordPayment(userForApi, address, month, amount, txHash);
      } catch (dbErr) {
        console.error('Error recording payment in database:', dbErr);
        // Continue even if this fails - blockchain is source of truth
      }
      
    } catch (err) {
      console.error('Payment error:', err);
      showToast(err instanceof Error ? err.message : "Unknown error occurred", "error");
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle funding the loan
  const handleFundLoan = async () => {
    if (!address || !blockchainAgreement) {
      showToast("Contract details not found", "error");
      return;
    }
    
    try {
      setProcessingAction('fundLoan');
      const txHash = await BlockchainService.fundLoan(
        address,
        blockchainAgreement.loanAmount
      );
      
      showToast(`Loan funded successfully! Transaction hash: ${formatAddress(txHash)}`, "success");
      
      // Update blockchain data instead of reloading
      await fetchBlockchainData();
      
    } catch (err) {
      console.error('Funding error:', err);
      showToast(err instanceof Error ? err.message : "Unknown error occurred", "error");
    } finally {
      setProcessingAction(null);
    }
  };
  
  // Handle simulating a default (for testing)
  const handleSimulateDefault = async () => {
    if (!address) {
      showToast("Contract address not found", "error");
      return;
    }
    
    try {
      setProcessingAction('simulateDefault');
      const txHash = await BlockchainService.simulateDefault(
        address
      );
      
      showToast(`Default simulated! Transaction hash: ${formatAddress(txHash)}`, "success");
      
      // Update blockchain data instead of reloading
      await fetchBlockchainData();
      
    } catch (err) {
      console.error('Simulate default error:', err);
      showToast(err instanceof Error ? err.message : "Unknown error occurred", "error");
    } finally {
      setProcessingAction(null);
    }
  };

  // If loading, show loading state
  if (loading) {
    return <LoadingState />;
  }

  // If error, show error state
  if (error || !dbAgreement) {
    return <ErrorState error={error} />;
  }
  
  // Use blockchain data first, fallback to database data
  const loanDetails = {
    borrower: blockchainAgreement?.borrower || dbAgreement?.borrower?.walletAddress || '',
    borrowerName: dbAgreement?.borrower?.name || dbAgreement?.borrower?.email || 'Unknown Borrower',
    lender: blockchainAgreement?.lender || dbAgreement?.lender?.walletAddress || '',
    lenderName: dbAgreement?.lender?.name || dbAgreement?.lender?.email || 'Unknown Lender',
    loanAmount: blockchainAgreement?.loanAmount || dbAgreement?.amount || '0',
    interestRate: blockchainAgreement?.interestRate || dbAgreement?.interestRate || 0,
    duration: blockchainAgreement?.duration || dbAgreement?.duration || 0,
    installmentAmount: blockchainAgreement?.monthlyPayment || '0',
    status: blockchainAgreement?.status || dbAgreement?.status || 'UNKNOWN',
    startDate: dbAgreement?.startDate ? new Date(dbAgreement.startDate) : new Date(),
    graceMonths: blockchainAgreement?.graceMonths || dbAgreement?.graceMonths || 0,
    rentalAddress: rentalContractAddress || 
                  (dbAgreement?.loanRequest?.rentalAgreement ? 
                   dbAgreement.loanRequest.rentalAgreement.contractAddress : ''),
    collateralAmount: blockchainAgreement?.collateralAmount || '0',
    remainingMonths: blockchainAgreement ? (blockchainAgreement.duration - blockchainAgreement.lastPaidMonth) : 0
  };
  
  // Determine which action buttons to show based on loan status and user role
  const showFundButton = isUserLender() && 
                        blockchainAgreement?.status === LoanAgreementStatus.INITIALIZED;
                        
  const showRepayButton = isUserBorrower() && 
                        blockchainAgreement?.status === LoanAgreementStatus.PAID;
                        
  const showTestButtons = process.env.NODE_ENV === 'development' || 
                          window.location.hostname === 'localhost';
                          
  const nextPaymentMonth = blockchainAgreement?.lastPaidMonth 
                          ? blockchainAgreement.lastPaidMonth + 1
                          : 1;
  
  // Determine available tabs based on status and role
  const getTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview', isVisible: true },
      { id: 'schedule', label: 'Payment Schedule', isVisible: true },
      { 
        id: 'pay', 
        label: 'Make Payment', 
        isVisible: showRepayButton && blockchainAgreement?.status === LoanAgreementStatus.PAID 
      },
      { 
        id: 'fund', 
        label: 'Fund Loan', 
        isVisible: showFundButton && blockchainAgreement?.status === LoanAgreementStatus.INITIALIZED
      },
      { 
        id: 'test', 
        label: 'Test Functions', 
        isVisible: showTestButtons
      }
    ];
    
    return tabs.filter(tab => tab.isVisible);
  };
  
  return (
    <div className="space-y-6">
      <AgreementHeader 
        status={loanDetails.status}
        createDate={loanDetails.startDate}
        loanAmount={loanDetails.loanAmount}
        interestRate={loanDetails.interestRate}
        formatDate={formatDate}
      />
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${getTabs().length}, minmax(0, 1fr))` }}>
          {getTabs().map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
          </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <LoanSummaryCard
            status={loanDetails.status}
            progress={calculateProgress()}
            borrower={loanDetails.borrower}
            borrowerName={loanDetails.borrowerName}
            lender={loanDetails.lender}
            lenderName={loanDetails.lenderName}
            rentalAddress={loanDetails.rentalAddress}
            collateralAmount={loanDetails.collateralAmount}
            loanAmount={loanDetails.loanAmount}
            interestRate={loanDetails.interestRate}
            duration={loanDetails.duration}
            graceMonths={loanDetails.graceMonths}
            installmentAmount={loanDetails.installmentAmount}
            lastPaidMonth={blockchainAgreement?.lastPaidMonth || 0}
            remainingMonths={loanDetails.remainingMonths}
            isUserBorrower={isUserBorrower()}
            isUserLender={isUserLender()}
            formatAddress={formatAddress}
          />
        </TabsContent>
        
        {/* Payment Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6 mt-6">
          <PaymentScheduleTab 
            payments={payments}
            formatDate={formatDate}
            getPaymentStatusBadge={(status) => <PaymentStatusBadge status={status} />}
          />
        </TabsContent>
        
        {/* Make Payment Tab */}
        {showRepayButton && (
        <TabsContent value="pay" className="space-y-6 mt-6">
            <MakePaymentTab
              contractAddress={dbAgreement.contractAddress}
              installmentAmount={loanDetails.installmentAmount}
              nextPaymentMonth={nextPaymentMonth}
              daysUntilNextPayment={daysUntilNextPayment()}
              processingAction={processingAction}
              formatDate={formatDate}
              handlePayment={handlePayment}
            />
          </TabsContent>
        )}
        
        {/* Fund Loan Tab */}
        {showFundButton && (
          <TabsContent value="fund" className="space-y-6 mt-6">
            <FundLoanTab
              contractAddress={dbAgreement.contractAddress}
              loanAmount={loanDetails.loanAmount}
              processingAction={processingAction}
              handleFundLoan={handleFundLoan}
            />
          </TabsContent>
        )}
        
        {/* Test Functions Tab */}
        {showTestButtons && (
          <TabsContent value="test" className="space-y-6 mt-6">
            <TestFunctionsTab
              isUserBorrower={isUserBorrower()}
              processingAction={processingAction}
              loanStatus={loanDetails.status}
              handleSimulateDefault={handleSimulateDefault}
            />
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LoanAgreementDetail; 