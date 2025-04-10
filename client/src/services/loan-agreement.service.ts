import { ethers } from 'ethers';
import LoanAgreementABI from '../contracts/ABI/LoanAgreement.json';

// Status enum to match contract values
export enum LoanStatus {
  INITIALIZED = 0,
  READY = 1,
  ACTIVE = 2,
  PAID = 3,
  COMPLETED = 4,
  DEFAULTED = 5
}

// Human-readable status labels
export const LoanStatusLabels: Record<LoanStatus, string> = {
  [LoanStatus.INITIALIZED]: 'Initialized',
  [LoanStatus.READY]: 'Ready',
  [LoanStatus.ACTIVE]: 'Active',
  [LoanStatus.PAID]: 'Paid',
  [LoanStatus.COMPLETED]: 'Completed',
  [LoanStatus.DEFAULTED]: 'Defaulted'
};

// Repayment detail interface
export interface RepaymentDetail {
  month: number;
  amount: string;
  paid: boolean;
}

// Loan details interface
export interface LoanDetails {
  borrower: string;
  lender: string;
  rentalContract: string;
  status: LoanStatus;
  loanAmount: string;
  interestRate: number;
  duration: number;
  graceMonths: number;
  collateralAmount: string;
  lastPaidMonth: number;
  monthlyPayment: string;
  repaymentSchedule: RepaymentDetail[];
  factory: string;
}

// Transaction result interface
export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

/**
 * LoanAgreementService provides blockchain interaction methods for the LoanAgreement contract
 */
export class LoanAgreementService {
  /**
   * Get a contract instance for the LoanAgreement at the specified address
   * 
   * @param address The contract address
   * @param signer The ethers.js signer to use for transactions
   * @returns An ethers.js Contract instance
   */
  public static getContractInstance(address: string, signer: ethers.Signer): ethers.Contract {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid contract address');
    }
    
    return new ethers.Contract(address, LoanAgreementABI, signer);
  }

  /**
   * Get all loan details from the contract
   * 
   * @param address The loan agreement contract address
   * @param signer The ethers.js signer
   * @returns Promise resolving to loan details
   */
  public static async getLoanDetails(address: string, signer: ethers.Signer): Promise<LoanDetails> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Fetch basic contract data in parallel for efficiency
      const [
        borrower,
        lender,
        rentalContract,
        factory,
        loanAmountBigInt,
        interestRateBigInt,
        durationBigInt,
        graceMonthsBigInt,
        collateralAmountBigInt,
        lastPaidMonthBigInt,
        monthlyPaymentBigInt,
        statusBigInt
      ] = await Promise.all([
        contract.borrower(),
        contract.lender(),
        contract.rentalContract(),
        contract.factory(),
        contract.loanAmount(),
        contract.interestRate(),
        contract.duration(),
        contract.graceMonths(),
        contract.collateralAmount(),
        contract.lastPaidMonth(),
        contract.monthlyPayment(),
        contract.getStatus()
      ]);
      
      // Convert BigInt values to appropriate formats
      const loanAmount = ethers.formatEther(loanAmountBigInt);
      const interestRate = Number(interestRateBigInt);
      const duration = Number(durationBigInt);
      const graceMonths = Number(graceMonthsBigInt);
      const collateralAmount = ethers.formatEther(collateralAmountBigInt);
      const lastPaidMonth = Number(lastPaidMonthBigInt);
      const monthlyPayment = ethers.formatEther(monthlyPaymentBigInt);
      const status = Number(statusBigInt) as LoanStatus;
      
      // Get repayment schedule
      const repaymentSchedule = await this.getRepaymentSchedule(address, signer);
      
      return {
        borrower,
        lender,
        rentalContract,
        factory,
        status,
        loanAmount,
        interestRate,
        duration,
        graceMonths,
        collateralAmount,
        lastPaidMonth,
        monthlyPayment,
        repaymentSchedule
      };
    } catch (error) {
      console.error('Error fetching loan details:', error);
      throw new Error(`Failed to get loan details: ${(error as Error).message}`);
    }
  }

  /**
   * Get the current status of the loan
   * 
   * @param address The loan agreement contract address
   * @param signer The ethers.js signer
   * @returns Promise resolving to loan status
   */
  public static async getStatus(address: string, signer: ethers.Signer): Promise<LoanStatus> {
    try {
      const contract = this.getContractInstance(address, signer);
      const statusBigInt = await contract.getStatus();
      return Number(statusBigInt) as LoanStatus;
    } catch (error) {
      console.error('Error fetching loan status:', error);
      throw new Error(`Failed to get loan status: ${(error as Error).message}`);
    }
  }

  /**
   * Fund a loan (lender only)
   * 
   * @param address The loan agreement contract address
   * @param amount The amount to fund in ETH
   * @param signer The ethers.js signer
   * @returns Promise resolving to transaction result
   */
  public static async fundLoan(
    address: string, 
    amount: string, 
    signer: ethers.Signer
  ): Promise<TransactionResult> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Set up event listeners for debugging
      contract.on("StatusChanged", (oldStatus: any, newStatus: any) => {
        console.log("📢 StatusChanged event:", { oldStatus: Number(oldStatus), newStatus: Number(newStatus) });
      });
      
      contract.on("LoanStarted", (amount: any, collateral: any) => {
        console.log("📢 LoanStarted event:", { 
          amount: ethers.formatEther(amount), 
          collateral: ethers.formatEther(collateral)
        });
      });
      
      // Get the rental contract address
      const rentalAddress = await contract.rentalContract();
      
      // Set up a minimal interface for RentalAgreement to watch its events
      const rentalABI = [
        "event RentPaid(uint256 month, uint256 amount, uint256 dueAmount)",
        "function receiveRentFromLoan() external payable"
      ];
      
      const rentalContract = new ethers.Contract(rentalAddress, rentalABI, signer);
      
      // Watch for RentPaid events on rental contract
      rentalContract.on("RentPaid", (month: any, amount: any, dueAmount: any) => {
        console.log("📢 RentPaid event from rental contract:", {
          month: Number(month),
          amount: ethers.formatEther(amount),
          dueAmount: ethers.formatEther(dueAmount)
        });
      });
      
      console.log("Starting fundLoan transaction with amount:", amount);
      
      // Convert ETH to Wei
      const amountWei = ethers.parseEther(amount);
      
      // Send transaction
      const tx = await contract.fundLoan({
        value: amountWei,
        gasLimit: 30000000 // Estimated gas limit
      });
      
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      
      // Clean up event listeners
      contract.removeAllListeners();
      rentalContract.removeAllListeners();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error funding loan:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Make a loan repayment (borrower only)
   * 
   * @param address The loan agreement contract address
   * @param month The month number for which payment is being made
   * @param amount The payment amount in ETH
   * @param signer The ethers.js signer
   * @returns Promise resolving to transaction result
   */
  public static async makeRepayment(
    address: string, 
    month: number, 
    amount: string, 
    signer: ethers.Signer
  ): Promise<TransactionResult> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Convert ETH to Wei
      const amountWei = ethers.parseEther(amount);
      
      // Send transaction
      const tx = await contract.makeRepayment(month, {
        value: amountWei,
        gasLimit: 300000 // Estimated gas limit
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error making repayment:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get repayment information for a specific month
   * 
   * @param address The loan agreement contract address
   * @param month The month number
   * @param signer The ethers.js signer
   * @returns Promise resolving to repayment detail
   */
  public static async getRepaymentInfo(
    address: string, 
    month: number, 
    signer: ethers.Signer
  ): Promise<RepaymentDetail> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Call contract method
      const [amountBigInt, isPaid] = await contract.getRepaymentInfo(month);
      
      return {
        month,
        amount: ethers.formatEther(amountBigInt),
        paid: isPaid
      };
    } catch (error) {
      console.error(`Error getting repayment info for month ${month}:`, error);
      throw new Error(`Failed to get repayment info: ${(error as Error).message}`);
    }
  }

  /**
   * Get the full repayment schedule for the loan
   * 
   * @param address The loan agreement contract address
   * @param signer The ethers.js signer
   * @returns Promise resolving to array of repayment details
   */
  public static async getRepaymentSchedule(
    address: string, 
    signer: ethers.Signer
  ): Promise<RepaymentDetail[]> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Get loan duration to know how many months to check
      const durationBigInt = await contract.duration();
      const duration = Number(durationBigInt);
      
      // Get payment status for all months
      const [monthNumbers, isPaidArray] = await contract.getPaymentStatus();
      
      const repaymentSchedule: RepaymentDetail[] = [];
      
      // Get monthly payment amount (constant for all months in this contract)
      const monthlyPaymentBigInt = await contract.monthlyPayment();
      const monthlyPayment = ethers.formatEther(monthlyPaymentBigInt);
      
      // Build repayment schedule
      for (let i = 0; i < duration; i++) {
        repaymentSchedule.push({
          month: Number(monthNumbers[i]),
          amount: monthlyPayment,
          paid: isPaidArray[i]
        });
      }
      
      return repaymentSchedule;
    } catch (error) {
      console.error('Error getting repayment schedule:', error);
      throw new Error(`Failed to get repayment schedule: ${(error as Error).message}`);
    }
  }

  /**
   * Get payment status for all months
   * 
   * @param address The loan agreement contract address
   * @param signer The ethers.js signer
   * @returns Promise resolving to arrays of month numbers and payment status
   */
  public static async getPaymentStatus(
    address: string, 
    signer: ethers.Signer
  ): Promise<{ months: number[], isPaid: boolean[] }> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Call contract method
      const [monthNumbersBigInt, isPaidArray] = await contract.getPaymentStatus();
      
      // Convert BigInt values to numbers
      const months = monthNumbersBigInt.map((bn: bigint) => Number(bn));
      
      return {
        months,
        isPaid: isPaidArray
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw new Error(`Failed to get payment status: ${(error as Error).message}`);
    }
  }

  /**
   * Format loan status to a human-readable string
   * 
   * @param statusCode The numeric status code from the contract
   * @returns Human-readable status string
   */
  public static formatLoanStatus(statusCode: number): string {
    return LoanStatusLabels[statusCode as LoanStatus] || 'Unknown';
  }

  /**
   * Calculate total repayment amount for a loan
   * 
   * @param loanAmount The loan amount in ETH
   * @param interestRate The interest rate (percentage)
   * @param duration The loan duration in months
   * @returns The total repayment amount in ETH
   */
  public static calculateTotalRepayment(
    loanAmount: string,
    interestRate: number,
    duration: number
  ): string {
    const amount = parseFloat(loanAmount);
    const interest = amount * (interestRate / 100);
    const total = amount + interest;
    
    return total.toFixed(18);
  }

  /**
   * Calculate monthly payment amount
   * 
   * @param loanAmount The loan amount in ETH
   * @param interestRate The interest rate (percentage)
   * @param duration The loan duration in months
   * @returns The monthly payment amount in ETH
   */
  public static calculateMonthlyPayment(
    loanAmount: string,
    interestRate: number,
    duration: number
  ): string {
    const totalRepayment = this.calculateTotalRepayment(loanAmount, interestRate, duration);
    const monthlyPayment = parseFloat(totalRepayment) / duration;
    
    return monthlyPayment.toFixed(18);
  }

  /**
   * Activate a loan (called after funding)
   * 
   * @param address The loan agreement contract address
   * @param signer The ethers.js signer
   * @returns Promise resolving to transaction result
   */
  public static async activateLoan(
    address: string,
    signer: ethers.Signer
  ): Promise<TransactionResult> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Set up event listeners for debugging
      contract.on("StatusChanged", (oldStatus: any, newStatus: any) => {
        console.log("📢 StatusChanged event:", { oldStatus: Number(oldStatus), newStatus: Number(newStatus) });
      });
      
      console.log("Starting activateLoan transaction");
      
      // Send transaction
      const tx = await contract.activateLoan({
        gasLimit: 30000000 // Estimated gas limit
      });
      
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      
      // Clean up event listeners
      contract.removeAllListeners();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error activating loan:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Pay rental using the loan amount
   * 
   * @param address The loan agreement contract address
   * @param signer The ethers.js signer
   * @returns Promise resolving to transaction result
   */
  public static async payRental(
    address: string,
    signer: ethers.Signer
  ): Promise<TransactionResult> {
    try {
      const contract = this.getContractInstance(address, signer);
      
      // Set up event listeners for debugging
      contract.on("StatusChanged", (oldStatus: any, newStatus: any) => {
        console.log("📢 StatusChanged event:", { oldStatus: Number(oldStatus), newStatus: Number(newStatus) });
      });
      
      contract.on("LoanStarted", (amount: any, collateral: any) => {
        console.log("📢 LoanStarted event:", { 
          amount: ethers.formatEther(amount), 
          collateral: ethers.formatEther(collateral)
        });
      });
      
      // Get the rental contract address
      const rentalAddress = await contract.rentalContract();
      
      // Set up a minimal interface for RentalAgreement to watch its events
      const rentalABI = [
        "event RentPaid(uint256 month, uint256 amount, uint256 dueAmount)",
        "function receiveRentFromLoan() external payable"
      ];
      
      const rentalContract = new ethers.Contract(rentalAddress, rentalABI, signer);
      
      // Watch for RentPaid events on rental contract
      rentalContract.on("RentPaid", (month: any, amount: any, dueAmount: any) => {
        console.log("📢 RentPaid event from rental contract:", {
          month: Number(month),
          amount: ethers.formatEther(amount),
          dueAmount: ethers.formatEther(dueAmount)
        });
      });
      
      console.log("Starting payRental transaction");
      
      // Send transaction
      const tx = await contract.payRental({
        gasLimit: 30000000 // Estimated gas limit
      });
      
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      
      // Clean up event listeners
      contract.removeAllListeners();
      rentalContract.removeAllListeners();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error paying rental:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
} 