import { useState, useCallback } from 'react';
import { ethers, Contract } from 'ethers';
import { useContracts } from '../contexts/ContractContext';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { LoanApi } from '../services/api.service';

interface RepaymentDetail {
  month: number;
  amount: string;
  dueDate: Date;
  paid: boolean;
}

interface LoanAgreementDetails {
  borrower: string;
  lender: string;
  rentalAgreementAddress: string;
  loanAmount: string;
  interestRate: number;
  monthlyPayment: string;
  loanDuration: number;
  graceMonths: number;
  isActive: boolean;
  isInitialized: boolean;
  collateralAmount: string;
  currentMonth: number;
  repaymentSchedule: RepaymentDetail[];
}

export function useLoanAgreement(contractAddress?: string) {
  const [loanContract, setLoanContract] = useState<Contract | null>(null);
  const [details, setDetails] = useState<LoanAgreementDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getLoanContract } = useContracts();
  const { signer, isConnected } = useWallet();
  const { currentUser } = useAuth();
  
  // Initialize the contract
  const initialize = useCallback(async (address: string) => {
    if (!isConnected || !signer) {
      setError("Wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const contract = await getLoanContract(address);
      if (contract) {
        setLoanContract(contract);
        return contract;
      } else {
        setError("Failed to initialize loan contract");
        return null;
      }
    } catch (err: any) {
      setError(err.message || "Error initializing contract");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getLoanContract, isConnected, signer]);
  
  // Load loan agreement details
  const loadDetails = useCallback(async () => {
    if (!contractAddress) {
      setError("Contract address not provided");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Initialize contract if not already done
      const contract = loanContract || await initialize(contractAddress);
      if (!contract) return;
      
      // Get basic contract data
      const borrower = await contract.borrower();
      const lender = await contract.lender();
      const rentalAgreementAddress = await contract.rentalAgreement();
      const loanAmount = ethers.formatEther(await contract.loanAmount());
      const interestRateBps = Number(await contract.interestRate());
      const interestRate = interestRateBps / 100; // Convert from basis points to percentage
      const monthlyPayment = ethers.formatEther(await contract.monthlyPayment());
      const loanDuration = Number(await contract.loanDuration());
      const graceMonths = Number(await contract.graceMonths());
      const isActive = await contract.isActive();
      const isInitialized = await contract.isInitialized();
      const collateralAmount = ethers.formatEther(await contract.collateralAmount());
      const currentMonth = Number(await contract.currentMonth());
      
      // Get repayment schedule
      const repaymentSchedule: RepaymentDetail[] = [];
      for (let i = 1; i <= loanDuration; i++) {
        const repayment = await contract.repaymentSchedule(i);
        repaymentSchedule.push({
          month: i,
          amount: ethers.formatEther(repayment.amount),
          dueDate: new Date(Number(repayment.dueDate) * 1000), // Convert to milliseconds
          paid: repayment.paid
        });
      }
      
      setDetails({
        borrower,
        lender,
        rentalAgreementAddress,
        loanAmount,
        interestRate,
        monthlyPayment,
        loanDuration,
        graceMonths,
        isActive,
        isInitialized,
        collateralAmount,
        currentMonth,
        repaymentSchedule
      });
    } catch (err: any) {
      setError(err.message || "Error loading loan details");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, initialize, loanContract]);
  
  // Initialize loan (for lender)
  const initializeLoan = useCallback(async () => {
    if (!contractAddress || !loanContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get loan amount
      const loanAmount = await loanContract.loanAmount();
      
      // Send transaction
      const tx = await loanContract.initializeLoan({
        value: loanAmount
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update backend
      if (currentUser) {
        await LoanApi.initializeLoan(
          currentUser,
          contractAddress,
          receipt.hash
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error initializing loan");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, loanContract, isConnected, loadDetails, currentUser]);
  
  // Make repayment (for borrower)
  const makeRepayment = useCallback(async (month: number) => {
    if (!contractAddress || !loanContract || !isConnected || !details) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Find repayment for the month
      const repayment = details.repaymentSchedule.find(r => r.month === month);
      if (!repayment) {
        setError(`Repayment for month ${month} not found`);
        return null;
      }
      
      // Convert repayment amount to wei
      const paymentAmount = ethers.parseEther(repayment.amount);
      
      // Send transaction
      const tx = await loanContract.makeRepayment(month, {
        value: paymentAmount
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update backend
      if (currentUser) {
        await LoanApi.makeRepayment(
          currentUser,
          contractAddress,
          month,
          repayment.amount,
          receipt.hash
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error making repayment");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, loanContract, isConnected, details, loadDetails, currentUser]);
  
  // Check if user is borrower
  const isBorrower = useCallback(async () => {
    if (!details || !signer) return false;
    const signerAddress = await signer.getAddress();
    return details.borrower.toLowerCase() === signerAddress.toLowerCase();
  }, [details, signer]);
  
  // Check if user is lender
  const isLender = useCallback(async () => {
    if (!details || !signer) return false;
    const signerAddress = await signer.getAddress();
    return details.lender.toLowerCase() === signerAddress.toLowerCase();
  }, [details, signer]);
  
  // Calculate loan summary
  const loanSummary = useCallback(() => {
    if (!details) return null;
    
    const totalRepayment = details.repaymentSchedule.reduce(
      (total, month) => total + parseFloat(month.amount),
      0
    );
    
    const paidAmount = details.repaymentSchedule
      .filter(month => month.paid)
      .reduce((total, month) => total + parseFloat(month.amount), 0);
    
    const remainingAmount = totalRepayment - paidAmount;
    
    return {
      totalLoanAmount: parseFloat(details.loanAmount),
      totalRepayment,
      paidAmount,
      remainingAmount,
      currentMonth: details.currentMonth,
      progress: Math.round((paidAmount / totalRepayment) * 100)
    };
  }, [details]);
  
  // Initialize when address is provided
  useCallback(() => {
    if (contractAddress && !loanContract) {
      initialize(contractAddress);
    }
  }, [contractAddress, loanContract, initialize]);
  
  return {
    loanContract,
    details,
    loading,
    error,
    initialize,
    loadDetails,
    initializeLoan,
    makeRepayment,
    isBorrower,
    isLender,
    loanSummary
  };
} 