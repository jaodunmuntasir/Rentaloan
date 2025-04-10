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
  const [activationState, setActivationState] = useState<TransactionState>({
    isProcessing: false
  });
  const [payRentalState, setPayRentalState] = useState<TransactionState>({
    isProcessing: false
  });
  
  // User states
  const [userIsBorrower, setUserIsBorrower] = useState<boolean>(false);
  const [userIsLender, setUserIsLender] = useState<boolean>(false);
  
  // Get wallet and auth context
  const { signer, walletAddress, isConnected } = useWallet();
  const { currentUser } = useAuth();
  
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
      
    } catch (err: any) {
      console.error("Error loading loan details:", err);
      setError(err.message || "Error loading loan details");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, signer, isConnected, walletAddress]);
  
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
      
      console.log("=== DEBUG: Starting loan funding process ===");
      console.log("Contract address:", contractAddress);
      console.log("Loan amount:", details.loanAmount);
      
      // Get rental contract address for debugging
      const loanContract = LoanAgreementService.getContractInstance(contractAddress, signer);
      const rentalContractAddress = await loanContract.rentalContract();
      console.log("Rental contract address:", rentalContractAddress);
      
      // Get rental contract status BEFORE funding
      try {
        const provider = signer.provider as ethers.BrowserProvider;
        const rentalContractABI = [
          "function getContractStatus() external view returns (uint8)",
          "function getContractDetails() external view returns (address, address, uint256, uint256, uint256, uint256, uint8, uint256, uint256, uint256, uint256, uint256)"
        ];
        const rentalContract = new ethers.Contract(rentalContractAddress, rentalContractABI, signer);
        const status = await rentalContract.getContractStatus();
        const details = await rentalContract.getContractDetails();
        console.log("Rental contract status BEFORE:", status);
        console.log("Rental contract details BEFORE:", {
          landlord: details[0],
          renter: details[1],
          rentalDuration: Number(details[2]),
          securityDeposit: ethers.formatEther(details[3]),
          baseRent: ethers.formatEther(details[4]),
          gracePeriod: Number(details[5]),
          status: Number(details[6]),
          currentSecurityDeposit: ethers.formatEther(details[7]),
          lastPaidMonth: Number(details[8]),
          dueAmount: ethers.formatEther(details[9]),
          skippedMonths: Number(details[10]),
          currentMonth: Number(details[11]),
        });
      } catch (err) {
        console.error("Error getting rental contract details BEFORE:", err);
      }
      
      // Use LoanSyncService to fund loan with synchronized backend update
      const result = await LoanSyncService.fundLoan(
        appUser,
        contractAddress,
        details.loanAmount,
        signer
      );
      
      console.log("Funding result:", result);
      
      if (result.success) {
        console.log("Transaction hash:", result.transactionHash);
        
        // Try to get transaction receipt for more details
        try {
          const provider = signer.provider as ethers.BrowserProvider;
          const receipt = await provider.getTransactionReceipt(result.transactionHash!);
          console.log("Transaction receipt:", receipt);
          
          // Parse logs for events
          if (receipt && receipt.logs) {
            console.log("Transaction logs:", receipt.logs);
          }
        } catch (err) {
          console.error("Error getting transaction receipt:", err);
        }
        
        // Check rental contract status AFTER funding
        try {
          const provider = signer.provider as ethers.BrowserProvider;
          const rentalContractABI = [
            "function getContractStatus() external view returns (uint8)",
            "function getContractDetails() external view returns (address, address, uint256, uint256, uint256, uint256, uint8, uint256, uint256, uint256, uint256, uint256)"
          ];
          const rentalContract = new ethers.Contract(rentalContractAddress, rentalContractABI, signer);
          const status = await rentalContract.getContractStatus();
          const details = await rentalContract.getContractDetails();
          console.log("Rental contract status AFTER:", status);
          console.log("Rental contract details AFTER:", {
            landlord: details[0],
            renter: details[1],
            rentalDuration: Number(details[2]),
            securityDeposit: ethers.formatEther(details[3]),
            baseRent: ethers.formatEther(details[4]),
            gracePeriod: Number(details[5]),
            status: Number(details[6]),
            currentSecurityDeposit: ethers.formatEther(details[7]),
            lastPaidMonth: Number(details[8]),
            dueAmount: ethers.formatEther(details[9]),
            skippedMonths: Number(details[10]),
            currentMonth: Number(details[11]),
          });
        } catch (err) {
          console.error("Error getting rental contract details AFTER:", err);
        }
      }
      
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
  
  // Activate loan (after funding)
  const activateLoan = useCallback(async (): Promise<SyncResult | null> => {
    if (!contractAddress || !signer || !isConnected || !details) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    // Both borrower and lender can activate the loan
    if (!userIsBorrower && !userIsLender) {
      setError("Only the borrower or lender can activate this loan");
      return null;
    }
    
    try {
      setActivationState({
        isProcessing: true
      });
      
      // Get app user for API
      const appUser = await getAppUser();
      if (!appUser) {
        throw new Error("User not authenticated");
      }
      
      console.log("=== DEBUG: Starting loan activation process ===");
      console.log("Contract address:", contractAddress);
      
      // Use LoanSyncService to activate loan with synchronized backend update
      const result = await LoanSyncService.activateLoan(
        appUser,
        contractAddress,
        signer
      );
      
      console.log("Activation result:", result);
      
      setActivationState({
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
      console.error("Error activating loan:", err);
      setActivationState({
        isProcessing: false,
        error: err.message || "Error activating loan",
        isSuccess: false,
        syncedWithBackend: false
      });
      return null;
    }
  }, [contractAddress, signer, isConnected, details, userIsBorrower, userIsLender, getAppUser]);
  
  // Pay rental (after activation)
  const payRental = useCallback(async (): Promise<SyncResult | null> => {
    if (!contractAddress || !signer || !isConnected || !details) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    // Both borrower and lender can pay rental
    if (!userIsBorrower && !userIsLender) {
      setError("Only the borrower or lender can pay rental");
      return null;
    }
    
    try {
      setPayRentalState({
        isProcessing: true
      });
      
      // Get app user for API
      const appUser = await getAppUser();
      if (!appUser) {
        throw new Error("User not authenticated");
      }
      
      console.log("=== DEBUG: Starting pay rental process ===");
      console.log("Contract address:", contractAddress);
      
      // Use LoanSyncService to pay rental with synchronized backend update
      const result = await LoanSyncService.payRental(
        appUser,
        contractAddress,
        signer
      );
      
      console.log("Pay rental result:", result);
      
      setPayRentalState({
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
      console.error("Error paying rental:", err);
      setPayRentalState({
        isProcessing: false,
        error: err.message || "Error paying rental",
        isSuccess: false,
        syncedWithBackend: false
      });
      return null;
    }
  }, [contractAddress, signer, isConnected, details, userIsBorrower, userIsLender, getAppUser]);
  
  // Get formatted actions available based on user role and loan status
  const getAvailableActions = useCallback(() => {
    if (!details) return [];
    
    const actions: { id: string; label: string; action: () => Promise<any>; disabled: boolean }[] = [];
    
    // Lender actions for funding
    if (userIsLender) {
      // Fund loan action (initial state)
      if (details.status === LoanStatus.INITIALIZED) {
        actions.push({
          id: 'fund',
          label: 'Fund Loan',
          action: fundLoan,
          disabled: fundingState.isProcessing
        });
      }
    }
    
    // Both lender and borrower can activate the loan after funding
    if ((userIsLender || userIsBorrower) && details.status === LoanStatus.READY) {
      actions.push({
        id: 'activate',
        label: 'Activate Loan',
        action: activateLoan,
        disabled: activationState.isProcessing
      });
    }
    
    // Both lender and borrower can pay rental after activation
    if ((userIsLender || userIsBorrower) && details.status === LoanStatus.ACTIVE) {
      actions.push({
        id: 'payRental',
        label: 'Pay Rental',
        action: payRental,
        disabled: payRentalState.isProcessing
      });
    }
    
    // Borrower actions for repayment
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
  }, [
    details, 
    userIsLender, 
    userIsBorrower, 
    fundLoan, 
    activateLoan, 
    payRental, 
    makeRepayment, 
    fundingState.isProcessing, 
    activationState.isProcessing, 
    payRentalState.isProcessing, 
    repaymentState.isProcessing
  ]);
  
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
    activationState,
    payRentalState,
    
    // Methods
    loadDetails,
    fundLoan,
    makeRepayment,
    getAvailableMonthsForPayment,
    getLoanSummary,
    getAvailableActions,
    activateLoan,
    payRental,
    
    // Helper function to refresh data
    refreshData: () => setRefreshTrigger(prev => prev + 1)
  };
} 