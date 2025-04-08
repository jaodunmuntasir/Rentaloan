import { ethers } from 'ethers';
import RentalAgreementABI from '../contracts/ABI/RentalAgreement.json';
import LoanAgreementFactoryABI from '../contracts/ABI/LoanAgreementFactory.json';
import LoanAgreementABI from '../contracts/ABI/LoanAgreement.json';
import { User } from '../types/user.types';
import contractAddresses from '../config/contractAddresses.json';
import { useWallet } from '../contexts/WalletContext';

interface RentalAgreementDetails {
  landlord: string;
  tenant: string;
  rentAmount: string;
  rentDuration: number;
  lastPaidMonth: number;
  isActive: boolean;
}

interface CollateralInfo {
  availableAmount: string;
  totalDeposited: string;
}

interface DueAmountInfo {
  dueAmount: string;
  nextPaymentMonth: number;
}

// Loan Agreement status enum from the contract
export enum LoanAgreementStatus {
  INITIALIZED = 0,  // Initial state when contract is created by borrower
  READY = 1,        // After lender sends funds
  ACTIVE = 2,       // After collateral is withdrawn
  PAID = 3,         // After loan amount is paid to rental contract
  COMPLETED = 4,    // Successfully repaid loan
  DEFAULTED = 5     // Loan went into default
}

// Loan agreement details interface
export interface LoanAgreementDetails {
  borrower: string;
  lender: string;
  loanAmount: string;
  collateralAmount: string;
  status: LoanAgreementStatus;
  repaymentSchedule: {
    amounts: string[];
    monthNumbers: number[];
  };
  monthlyPayment: string;
  lastPaidMonth: number;
  graceMonths: number;
  duration: number;
  interestRate: number;
}

// Get the WalletContext instance (for use in non-component functions)
let walletContextInstance: any = null;

export function setWalletContextInstance(instance: any) {
  walletContextInstance = instance;
}

export class BlockchainService {
  private static factoryAddress: string = contractAddresses.loanAgreementFactory;

  /**
   * Get the provider and signer from WalletContext
   * @returns The provider and signer from WalletContext
   */
  private static getWalletConnection(): { provider: ethers.Provider | null, signer: ethers.Signer | null } {
    if (!walletContextInstance) {
      console.error('WalletContext not initialized. Operations requiring a signer will fail.');
      
      // Return a read-only provider for non-transaction operations
      const fallbackProvider = new ethers.JsonRpcProvider('http://localhost:8545');
      return { provider: fallbackProvider, signer: null };
    }
    
    return {
      provider: walletContextInstance.provider,
      signer: walletContextInstance.signer
    };
  }

  static async getRentalAgreementDetails(contractAddress: string): Promise<RentalAgreementDetails> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, RentalAgreementABI, provider);

      // Get basic details from the contract
      const landlord = await contract.landlord();
      const tenant = await contract.tenant();
      const rentAmount = await contract.rentAmount();
      const rentDuration = await contract.rentalDuration();
      const lastPaidMonth = await contract.lastPaidMonth();
      const status = await contract.getContractStatus();
      const isActive = status === 1; // Assuming 1 is ACTIVE status

      return {
        landlord,
        tenant,
        rentAmount: ethers.formatEther(rentAmount),
        rentDuration: parseInt(rentDuration.toString()),
        lastPaidMonth: parseInt(lastPaidMonth.toString()),
        isActive
      };
    } catch (error) {
      console.error('Error fetching rental agreement details:', error);
      throw new Error('Failed to fetch rental agreement details from blockchain');
    }
  }

  static async getAvailableCollateral(contractAddress: string): Promise<CollateralInfo> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, RentalAgreementABI, provider);

      // Get security deposit amount from the contract
      const securityDeposit = await contract.securityDeposit();
      
      // Try to get current security deposit - this is the available amount
      const currentSecurityDeposit = await contract.getCurrentSecurityDeposit();
      
      return {
        availableAmount: ethers.formatEther(currentSecurityDeposit),
        totalDeposited: ethers.formatEther(securityDeposit)
      };
    } catch (error) {
      console.error('Error fetching collateral info:', error);
      throw new Error('Failed to fetch collateral information from blockchain');
    }
  }

  static async getDueAmount(contractAddress: string): Promise<DueAmountInfo> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, RentalAgreementABI, provider);

      // Get the amount due for the next payment
      const dueAmount = await contract.dueAmount();
      const lastPaidMonth = await contract.lastPaidMonth();

      return {
        dueAmount: ethers.formatEther(dueAmount),
        nextPaymentMonth: parseInt(lastPaidMonth.toString()) + 1
      };
    } catch (error) {
      console.error('Error fetching due amount:', error);
      throw new Error('Failed to fetch due amount from blockchain');
    }
  }

  /**
   * Create a new loan agreement using the factory contract
   * @param lenderAddress The lender's address
   * @param rentalContractAddress The rental contract address
   * @param loanAmount The loan amount in ETH
   * @param interestRate The interest rate (e.g., 5 for 5%)
   * @param duration The loan duration in months
   * @param graceMonths The grace period in months
   * @returns The transaction receipt with contract address
   * 
   * IMPORTANT: This transaction MUST be sent from the borrower's wallet
   * as the smart contract uses msg.sender as the borrower address.
   */
  static async createLoanAgreement(
    lenderAddress: string,
    rentalContractAddress: string,
    loanAmount: string,
    interestRate: number,
    duration: number,
    graceMonths: number
  ): Promise<{ contractAddress: string; transactionHash: string }> {
    try {
      console.log('Creating loan agreement with factory address:', this.factoryAddress);
      console.log('Parameters:', {
        lenderAddress,
        rentalContractAddress,
        loanAmount,
        interestRate,
        duration,
        graceMonths
      });
      
      // Get the signer from WalletContext
      const { signer } = this.getWalletConnection();
      if (!signer) {
        throw new Error('Wallet not connected. Please connect your wallet to create a loan agreement.');
      }
      
      // Get the signer's address (will be the borrower in the contract)
      const signerAddress = await signer.getAddress();
      console.log('Signer address (will be set as borrower):', signerAddress);
      
      // Check if the factory address is set
      if (!this.factoryAddress) {
        console.error('Factory address is not configured!');
        throw new Error('Loan agreement factory address not configured');
      }
      
      // Create contract instance with the factory
      const factory = new ethers.Contract(
        this.factoryAddress,
        LoanAgreementFactoryABI,
        signer
      );
      
      console.log('Factory contract instance created');

      // Convert loan amount to wei
      const loanAmountWei = ethers.parseEther(loanAmount.toString());
      console.log('Loan amount in wei:', loanAmountWei.toString());
      
      // Convert interest rate from decimal (4.75) to integer (5) - contract expects 0-100 range
      const interestRateInt = Math.round(interestRate);
      console.log('Interest rate converted from', interestRate, 'to', interestRateInt);
      
      // Ensure duration and graceMonths are integers
      const durationInt = Math.round(duration);
      const graceMonthsInt = Math.round(graceMonths);
      console.log('Duration:', durationInt, 'Grace months:', graceMonthsInt);
      
      // Create a loan agreement
      console.log('Submitting transaction to create loan agreement...');
      console.log('IMPORTANT: The transaction signer (current wallet address) will be set as the borrower!');
      
      const tx = await factory.createLoanAgreement(
        lenderAddress,
        rentalContractAddress,
        loanAmountWei,
        interestRateInt, // Use integer interest rate for blockchain
        durationInt, // Use integer duration
        graceMonthsInt // Use integer grace months
      );
      
      console.log('Transaction submitted, waiting for confirmation...');
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed with hash:', receipt.hash);
      
      // Get the loan contract address from event logs
      const event = receipt.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'LoanAgreementCreated');

      if (!event) {
        throw new Error('Failed to find LoanAgreementCreated event in transaction logs');
      }
      
      const contractAddress = event.args.loan;
      
      return {
        contractAddress,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error creating loan agreement:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        throw new Error(`Failed to create loan agreement on blockchain: ${error.message}`);
      }
      throw new Error('Failed to create loan agreement on blockchain');
    }
  }

  /**
   * Get details of a loan agreement from the blockchain
   * @param contractAddress The loan agreement contract address
   * @returns The loan agreement details
   */
  static async getLoanAgreementDetails(contractAddress: string): Promise<LoanAgreementDetails> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, provider);
      
      // Get all the necessary details from the contract
      const borrower = await contract.getBorrower();
      const lender = await contract.getLender();
      const loanAmount = await contract.getLoanAmount();
      const collateralAmount = await contract.getCollateralAmount();
      const status = await contract.getStatus();
      const repaymentSchedule = await contract.getRepaymentSchedule();
      const monthlyPayment = await contract.calculateMonthlyPayment();
      const lastPaidMonth = await contract.lastPaidMonth();
      const duration = await contract.duration();
      const interestRate = await contract.interestRate();
      const graceMonths = await contract.graceMonths();
      
      // Format amounts to ETH
      const formattedLoanAmount = ethers.formatEther(loanAmount);
      const formattedCollateralAmount = ethers.formatEther(collateralAmount);
      const formattedMonthlyPayment = ethers.formatEther(monthlyPayment);
      
      // Format payment schedule
      const formattedSchedule = {
        amounts: repaymentSchedule[0].map((amount: bigint) => ethers.formatEther(amount)),
        monthNumbers: repaymentSchedule[1].map((month: bigint) => Number(month))
      };
      
      return {
        borrower,
        lender,
        loanAmount: formattedLoanAmount,
        collateralAmount: formattedCollateralAmount,
        status: Number(status),
        repaymentSchedule: formattedSchedule,
        monthlyPayment: formattedMonthlyPayment,
        lastPaidMonth: Number(lastPaidMonth),
        duration: Number(duration),
        interestRate: Number(interestRate),
        graceMonths: Number(graceMonths)
      };
    } catch (error) {
      console.error('Error fetching loan agreement details:', error);
      throw new Error('Failed to fetch loan agreement details from blockchain');
    }
  }

  /**
   * Fund a loan agreement as the lender
   * @param contractAddress The loan agreement contract address
   * @param loanAmount The loan amount to send
   * @returns The transaction receipt
   */
  static async fundLoan(contractAddress: string, loanAmount: string): Promise<string> {
    try {
      const { signer } = this.getWalletConnection();
      if (!signer) throw new Error('Wallet not connected');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, signer);
      
      // Convert loan amount to wei
      const loanAmountWei = ethers.parseEther(loanAmount.toString());
      
      // Fund the loan
      const tx = await contract.fundLoan({ value: loanAmountWei });
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Error funding loan:', error);
      throw new Error('Failed to fund the loan on blockchain');
    }
  }

  /**
   * Make a repayment for a loan
   * @param contractAddress The loan agreement contract address
   * @param monthNumber The month number to pay for
   * @param amount The amount to pay
   * @returns The transaction receipt
   */
  static async makeRepayment(contractAddress: string, monthNumber: number, amount: string): Promise<string> {
    try {
      const { signer } = this.getWalletConnection();
      if (!signer) throw new Error('Wallet not connected');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, signer);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount.toString());
      
      // Make the repayment
      const tx = await contract.makeRepayment(monthNumber, { value: amountWei });
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Error making repayment:', error);
      throw new Error('Failed to make repayment on blockchain');
    }
  }

  /**
   * Simulate a loan default (for testing purposes)
   * @param contractAddress The loan agreement contract address
   * @returns The transaction hash
   */
  static async simulateDefault(contractAddress: string): Promise<string> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, provider);
      
      // Call simulateDefault function
      const tx = await contract.simulateDefault();
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Error simulating loan default:', error);
      throw new Error('Failed to simulate loan default on blockchain');
    }
  }

  /**
   * Get detailed payment status for all months
   * @param contractAddress The loan agreement contract address
   * @returns Array of month numbers and their payment status
   */
  static async getPaymentStatus(contractAddress: string): Promise<{monthNumbers: number[], isPaid: boolean[]}> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, provider);
      
      const paymentStatus = await contract.getPaymentStatus();
      
      return {
        monthNumbers: paymentStatus[0].map((month: bigint) => Number(month)),
        isPaid: paymentStatus[1]
      };
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw new Error('Failed to fetch payment status from blockchain');
    }
  }
  
  /**
   * Get the repayment info for a specific month
   * @param contractAddress The loan agreement contract address
   * @param month The month to check
   * @returns Object containing payment amount and isPaid status
   */
  static async getRepaymentInfo(contractAddress: string, month: number): Promise<{amount: string, isPaid: boolean}> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, provider);
      
      const info = await contract.getRepaymentInfo(month);
      
      return {
        amount: ethers.formatEther(info[0]),
        isPaid: info[1]
      };
    } catch (error) {
      console.error('Error fetching repayment info:', error);
      throw new Error('Failed to fetch repayment info from blockchain');
    }
  }
  
  /**
   * Get the rental contract address from the loan agreement
   * @param contractAddress The loan agreement contract address
   * @returns The rental contract address
   */
  static async getRentalContractAddress(contractAddress: string): Promise<string> {
    try {
      const { provider } = this.getWalletConnection();
      if (!provider) throw new Error('Provider not available');
      
      const contract = new ethers.Contract(contractAddress, LoanAgreementABI, provider);
      
      return await contract.rentalContract();
    } catch (error) {
      console.error('Error fetching rental contract address:', error);
      throw new Error('Failed to fetch rental contract address from blockchain');
    }
  }
} 