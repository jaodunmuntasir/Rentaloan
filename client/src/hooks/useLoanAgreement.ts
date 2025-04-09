import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { LoanApi } from '../services/api.service';
import { 
  LoanAgreementService, 
  LoanDetails, 
  LoanStatus,
} from '../services/loan-agreement.service';
import { LoanSyncService, SyncResult } from '../services/loan-sync.service';

export interface LoanSummary {
  totalLoanAmount: number;
  totalRepayment: number;
  paidAmount: number;
  remainingAmount: number;
  currentMonth: number;
  progress: number;
}

interface TransactionState {
  isProcessing: boolean;
  hash?: string;
  error?: string;
  isSuccess?: boolean;
  syncedWithBackend?: boolean;
  backendError?: string;
}

export function useLoanAgreement(contractAddress?: string) {
  // State for loan details
  const [details, setDetails] = useState<LoanDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Transaction states
  const [fundingState, setFundingState] = useState<TransactionState>({
    isProcessing: false
  });
  const [repaymentState, setRepaymentState] = useState<TransactionState>({
    isProcessing: false
  });
  
  // User states
  const [userIsBorrower, setUserIsBorrower] = useState<boolean>(false);
  const [userIsLender, setUserIsLender] = useState<boolean>(false);
  
  // Get wallet and auth context
  const { signer, walletAddress, isConnected } = useWallet();
  const { currentUser } = useAuth();
  
  // Event listener cleanup reference
  const [eventListenerContract, setEventListenerContract] = useState<ethers.Contract | null>(null);
  
  // Helper to create App User object for API calls
  const getAppUser = useCallback(async () => {
    if (!currentUser) return null;
    
    return {
      id: currentUser.uid,
      email: currentUser.email || '',
      name: currentUser.displayName || '',
      walletAddress: walletAddress || null,
      token: await currentUser.getIdToken()
    };
  }, [currentUser, walletAddress]);
  
  // Load loan details
  const loadDetails = useCallback(async () => {
    if (!contractAddress || !signer || !isConnected) {
      setError("Contract address not provided or wallet not connected");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch loan details from blockchain
      const loanDetails = await LoanAgreementService.getLoanDetails(contractAddress, signer);
      setDetails(loanDetails);
      
      // Check if current user is borrower or lender
      if (walletAddress) {
        const isBorrower = loanDetails.borrower.toLowerCase() === walletAddress.toLowerCase();
        const isLender = loanDetails.lender.toLowerCase() === walletAddress.toLowerCase();
        
        setUserIsBorrower(isBorrower);
        setUserIsLender(isLender);
      }
      
      // Synchronize status with backend
      const appUser = await getAppUser();
      if (appUser && signer) {
        LoanSyncService.syncLoanStatus(appUser, contractAddress, signer)
          .then(result => {
            if (!result.success) {
              console.warn('Failed to sync loan status with backend:', result.error);
            }
          })
          .catch(err => {
            console.error('Error syncing loan status:', err);
          });
      }
    } catch (err: any) {
      console.error("Error loading loan details:", err);
      setError(err.message || "Error loading loan details");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, signer, isConnected, walletAddress, getAppUser]);
  
  // Refresh details when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadDetails();
    }
  }, [refreshTrigger, loadDetails]);
  
  // Initial load of details
  useEffect(() => {
    if (contractAddress && signer && isConnected) {
      loadDetails();
    }
  }, [contractAddress, signer, isConnected, loadDetails]);
  
  // Set up event listeners
  useEffect(() => {
    if (!contractAddress || !isConnected) return;
    
    // Get provider from signer
    const provider = signer?.provider;
    if (!provider) return;
    
    // Clean up previous listeners
    if (eventListenerContract) {
      eventListenerContract.removeAllListeners();
    }
    
    // Set up new event listeners
    const contract = LoanAgreementService.listenForEvents(
      contractAddress,
      provider,
      async (eventName, data) => {
        console.log(`Event received: ${eventName}`, data);
        
        // Handle status changes with backend sync
        if (eventName === 'StatusChanged' && data.newStatus !== undefined) {
          const appUser = await getAppUser();
          if (appUser && data.transactionHash) {
            LoanSyncService.recordStatusChange(
              appUser,
              contractAddress,
              Number(data.newStatus),
              data.transactionHash
            ).catch(err => {
              console.error('Error recording status change:', err);
            });
          }
        }
        
        // Refresh data when events occur
        setRefreshTrigger(prev => prev + 1);
      }
    );
    
    setEventListenerContract(contract);
    
    // Cleanup function
    return () => {
      contract.removeAllListeners();
    };
  }, [contractAddress, signer, isConnected, eventListenerContract, getAppUser]);
  
  // Fund loan (for lender)
  const fundLoan = useCallback(async (): Promise<SyncResult | null> => {
    if (!contractAddress || !signer || !isConnected || !details) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    if (!userIsLender) {
      setError("Only the lender can fund this loan");
      return null;
    }
    
    try {
      setFundingState({
        isProcessing: true
      });
      
      // Get app user for API
      const appUser = await getAppUser();
      if (!appUser) {
        throw new Error("User not authenticated");
      }
      
      // Use LoanSyncService to fund loan with synchronized backend update
      const result = await LoanSyncService.fundLoan(
        appUser,
        contractAddress,
        details.loanAmount,
        signer
      );
      
      setFundingState({
        isProcessing: false,
        hash: result.transactionHash,
        isSuccess: result.success,
        syncedWithBackend: result.syncedWithBackend,
        backendError: result.backendError,
        error: result.success ? undefined : result.error
      });
      
      if (result.success) {
        // Refresh details
        setRefreshTrigger(prev => prev + 1);
      }
      
      return result;
    } catch (err: any) {
      console.error("Error funding loan:", err);
      setFundingState({
        isProcessing: false,
        error: err.message || "Error funding loan",
        isSuccess: false,
        syncedWithBackend: false
      });
      return null;
    }
  }, [contractAddress, signer, isConnected, details, userIsLender, getAppUser]);
  
  // Make repayment (for borrower)
  const makeRepayment = useCallback(async (month: number): Promise<SyncResult | null> => {
    if (!contractAddress || !signer || !isConnected || !details) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    if (!userIsBorrower) {
      setError("Only the borrower can make repayments");
      return null;
    }
    
    try {
      setRepaymentState({
        isProcessing: true
      });
      
      // Find repayment for the month
      const repayment = details.repaymentSchedule.find(r => r.month === month);
      if (!repayment) {
        throw new Error(`Repayment for month ${month} not found`);
      }
      
      // Get app user for API
      const appUser = await getAppUser();
      if (!appUser) {
        throw new Error("User not authenticated");
      }
      
      // Use LoanSyncService to make repayment with synchronized backend update
      const result = await LoanSyncService.makeRepayment(
        appUser,
        contractAddress,
        month,
        repayment.amount,
        signer
      );
      
      setRepaymentState({
        isProcessing: false,
        hash: result.transactionHash,
        isSuccess: result.success,
        syncedWithBackend: result.syncedWithBackend,
        backendError: result.backendError,
        error: result.success ? undefined : result.error
      });
      
      if (result.success) {
        // Refresh details
        setRefreshTrigger(prev => prev + 1);
      }
      
      return result;
    } catch (err: any) {
      console.error("Error making repayment:", err);
      setRepaymentState({
        isProcessing: false,
        error: err.message || "Error making repayment",
        isSuccess: false,
        syncedWithBackend: false
      });
      return null;
    }
  }, [contractAddress, signer, isConnected, details, userIsBorrower, getAppUser]);
  
  // Get unpaid months that are available for payment
  const getAvailableMonthsForPayment = useCallback(() => {
    if (!details) return [];
    
    const unpaidMonths: number[] = [];
    const lastPaid = details.lastPaidMonth;
    
    // Loop through months to find unpaid ones
    for (let i = 1; i <= details.duration; i++) {
      const repayment = details.repaymentSchedule.find(r => r.month === i);
      if (repayment && !repayment.paid && i > lastPaid) {
        unpaidMonths.push(i);
      }
    }
    
    return unpaidMonths;
  }, [details]);
  
  // Calculate loan summary
  const getLoanSummary = useCallback((): LoanSummary | null => {
    if (!details) return null;
    
    const totalLoanAmount = parseFloat(details.loanAmount);
    
    // Calculate total repayment from schedule
    const totalRepayment = details.repaymentSchedule.reduce(
      (total, month) => total + parseFloat(month.amount),
      0
    );
    
    // Calculate amount paid so far
    const paidAmount = details.repaymentSchedule
      .filter(month => month.paid)
      .reduce((total, month) => total + parseFloat(month.amount), 0);
    
    // Calculate remaining amount
    const remainingAmount = totalRepayment - paidAmount;
    
    // Calculate progress percentage
    const progress = Math.round((paidAmount / totalRepayment) * 100);
    
    return {
      totalLoanAmount,
      totalRepayment,
      paidAmount,
      remainingAmount,
      currentMonth: details.lastPaidMonth + 1,
      progress
    };
  }, [details]);
  
  // Get formatted actions available based on user role and loan status
  const getAvailableActions = useCallback(() => {
    if (!details) return [];
    
    const actions: { id: string; label: string; action: () => Promise<any>; disabled: boolean }[] = [];
    
    // Lender actions
    if (userIsLender) {
      // Fund loan action
      if (details.status === LoanStatus.INITIALIZED) {
        actions.push({
          id: 'fund',
          label: 'Fund Loan',
          action: fundLoan,
          disabled: fundingState.isProcessing
        });
      }
    }
    
    // Borrower actions
    if (userIsBorrower) {
      // Make repayment action
      if (details.status === LoanStatus.PAID) {
        const nextMonth = details.lastPaidMonth + 1;
        
        if (nextMonth <= details.duration) {
          actions.push({
            id: 'repay',
            label: `Make Payment for Month ${nextMonth}`,
            action: () => makeRepayment(nextMonth),
            disabled: repaymentState.isProcessing
          });
        }
      }
    }
    
    return actions;
  }, [details, userIsLender, userIsBorrower, fundLoan, makeRepayment, fundingState.isProcessing, repaymentState.isProcessing]);
  
  // Sync loan status with backend
  const syncStatus = useCallback(async (): Promise<boolean> => {
    if (!contractAddress || !signer || !isConnected) {
      return false;
    }
    
    try {
      const appUser = await getAppUser();
      if (!appUser) {
        return false;
      }
      
      const result = await LoanSyncService.syncLoanStatus(
        appUser,
        contractAddress,
        signer
      );
      
      return result.success && result.syncedWithBackend;
    } catch (err) {
      console.error("Error syncing loan status:", err);
      return false;
    }
  }, [contractAddress, signer, isConnected, getAppUser]);
  
  return {
    // Basic state
    details,
    loading,
    error,
    
    // User role information
    isBorrower: userIsBorrower,
    isLender: userIsLender,
    
    // Transaction states
    fundingState,
    repaymentState,
    
    // Methods
    loadDetails,
    fundLoan,
    makeRepayment,
    getAvailableMonthsForPayment,
    getLoanSummary,
    getAvailableActions,
    syncStatus,
    
    // Helper function to refresh data
    refreshData: () => setRefreshTrigger(prev => prev + 1)
  };
} 