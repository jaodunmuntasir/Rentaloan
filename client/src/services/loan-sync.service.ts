import { ethers } from 'ethers';
import { User as AppUser } from '../types/user.types';
import { LoanAgreementService, LoanStatus, TransactionResult } from './loan-agreement.service';
import { LoanApi } from './api.service';

/**
 * Result of a synchronized operation
 */
export interface SyncResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  syncedWithBackend: boolean;
  error?: string;
  backendError?: string;
}

/**
 * LoanSyncService coordinates blockchain transactions with backend API updates
 */
export class LoanSyncService {
  /**
   * Fund a loan and record the transaction in the backend
   * 
   * @param user Current user
   * @param contractAddress Loan agreement contract address
   * @param amount Amount to fund in ETH
   * @param signer Ethers signer
   * @returns Synchronized result
   */
  public static async fundLoan(
    user: AppUser,
    contractAddress: string,
    amount: string,
    signer: ethers.Signer
  ): Promise<SyncResult> {
    try {
      // Step 1: Execute blockchain transaction
      const txResult = await LoanAgreementService.fundLoan(contractAddress, amount, signer);
      
      // Step 2: If blockchain transaction failed, return early
      if (!txResult.success) {
        return {
          success: false,
          syncedWithBackend: false,
          error: txResult.error
        };
      }
      
      // Step 3: Record transaction in backend
      const backendResult = await LoanApi.fundLoan(
        user, 
        contractAddress, 
        amount, 
        txResult.transactionHash!
      );
      
      // Step 4: Update loan status in backend
      const currentStatus = await LoanAgreementService.getStatus(contractAddress, signer);
      await LoanApi.updateLoanStatusWithRetry(user, contractAddress, currentStatus);
      
      // Step 5: Record transaction details
      await LoanApi.recordTransaction(
        user,
        contractAddress,
        txResult.transactionHash!,
        'fund',
        { amount }
      );
      
      return {
        success: true,
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        syncedWithBackend: backendResult.success,
        backendError: backendResult.success ? undefined : backendResult.error
      };
    } catch (error) {
      console.error('Error in fund loan sync operation:', error);
      return {
        success: false,
        syncedWithBackend: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Make a repayment and record it in the backend
   * 
   * @param user Current user
   * @param contractAddress Loan agreement contract address
   * @param month Month number being paid
   * @param amount Payment amount in ETH
   * @param signer Ethers signer
   * @returns Synchronized result
   */
  public static async makeRepayment(
    user: AppUser,
    contractAddress: string,
    month: number,
    amount: string,
    signer: ethers.Signer
  ): Promise<SyncResult> {
    try {
      // Step 1: Execute blockchain transaction
      const txResult = await LoanAgreementService.makeRepayment(
        contractAddress, 
        month, 
        amount, 
        signer
      );
      
      // Step 2: If blockchain transaction failed, return early
      if (!txResult.success) {
        return {
          success: false,
          syncedWithBackend: false,
          error: txResult.error
        };
      }
      
      // Step 3: Get loan details to determine if payment completes the loan
      const loanDetails = await LoanAgreementService.getLoanDetails(contractAddress, signer);
      const isComplete = loanDetails.lastPaidMonth >= loanDetails.duration;
      
      // Step 4: Record repayment in backend
      const backendResult = await LoanApi.makeRepayment(
        user, 
        contractAddress, 
        month, 
        amount, 
        txResult.transactionHash!,
        isComplete
      );
      
      // Step 5: Update loan status in backend
      const currentStatus = await LoanAgreementService.getStatus(contractAddress, signer);
      await LoanApi.updateLoanStatusWithRetry(user, contractAddress, currentStatus);
      
      // Step 6: Record payment transaction
      await LoanApi.recordPayment(user, contractAddress, month, amount, txResult.transactionHash!);
      
      // Step 7: Record transaction details
      await LoanApi.recordTransaction(
        user,
        contractAddress,
        txResult.transactionHash!,
        'repay',
        { month, amount, isComplete }
      );
      
      return {
        success: true,
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        syncedWithBackend: true
      };
    } catch (error) {
      console.error('Error in make repayment sync operation:', error);
      return {
        success: false,
        syncedWithBackend: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Synchronize loan status with the backend
   * 
   * @param user Current user
   * @param contractAddress Loan agreement contract address
   * @param signer Ethers signer
   * @returns Synchronized result
   */
  public static async syncLoanStatus(
    user: AppUser,
    contractAddress: string,
    signer: ethers.Signer
  ): Promise<SyncResult> {
    try {
      // Step 1: Get current blockchain status
      const currentStatus = await LoanAgreementService.getStatus(contractAddress, signer);
      
      // Step 2: Update status in backend
      const backendResult = await LoanApi.updateLoanStatusWithRetry(user, contractAddress, currentStatus);
      
      return {
        success: true,
        syncedWithBackend: backendResult.success,
        backendError: backendResult.success ? undefined : backendResult.error
      };
    } catch (error) {
      console.error('Error synchronizing loan status:', error);
      return {
        success: false,
        syncedWithBackend: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Record a status change in the backend
   * 
   * @param user Current user
   * @param contractAddress Loan agreement contract address
   * @param status Loan status
   * @param transactionHash Transaction hash that caused the status change
   * @returns Synchronized result
   */
  public static async recordStatusChange(
    user: AppUser,
    contractAddress: string,
    status: LoanStatus,
    transactionHash: string
  ): Promise<SyncResult> {
    try {
      // Step 1: Update status in backend
      const statusResult = await LoanApi.updateLoanStatusWithRetry(user, contractAddress, status);
      
      // Step 2: Record transaction with status change
      let transactionType: 'fund' | 'repay' | 'withdraw' | 'complete' | 'default' = 'repay';
      
      // Determine transaction type based on status
      switch (status) {
        case LoanStatus.READY:
          transactionType = 'fund';
          break;
        case LoanStatus.COMPLETED:
          transactionType = 'complete';
          break;
        case LoanStatus.DEFAULTED:
          transactionType = 'default';
          break;
        case LoanStatus.ACTIVE:
          transactionType = 'withdraw';
          break;
        default:
          transactionType = 'repay';
      }
      
      const transactionResult = await LoanApi.recordTransaction(
        user,
        contractAddress,
        transactionHash,
        transactionType,
        { newStatus: status }
      );
      
      return {
        success: true,
        transactionHash,
        syncedWithBackend: statusResult.success && transactionResult.success,
        backendError: statusResult.success ? undefined : statusResult.error
      };
    } catch (error) {
      console.error('Error recording status change:', error);
      return {
        success: false,
        syncedWithBackend: false,
        error: (error as Error).message
      };
    }
  }
} 