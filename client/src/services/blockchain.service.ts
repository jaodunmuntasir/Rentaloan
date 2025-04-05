import { ethers } from 'ethers';
import RentalAgreementABI from '../contracts/ABI/RentalAgreement.json';
import { User } from '../types/user.types';

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

export class BlockchainService {
  private static provider: ethers.Provider;

  private static initialize() {
    if (!this.provider) {
      // Use window.ethereum if available (MetaMask or other wallet)
      const ethereum = (window as any).ethereum;
      if (ethereum) {
        this.provider = new ethers.BrowserProvider(ethereum);
      } else {
        // Fallback to HTTP provider (read-only operations)
        this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
      }
    }
    return this.provider;
  }

  static async getRentalAgreementDetails(contractAddress: string): Promise<RentalAgreementDetails> {
    try {
      const provider = this.initialize();
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
      const provider = this.initialize();
      const contract = new ethers.Contract(contractAddress, RentalAgreementABI, provider);

      // Get security deposit amount
      const securityDeposit = await contract.securityDeposit();
      const totalDeposited = await contract.totalDeposited();

      return {
        availableAmount: ethers.formatEther(securityDeposit),
        totalDeposited: ethers.formatEther(totalDeposited)
      };
    } catch (error) {
      console.error('Error fetching collateral info:', error);
      throw new Error('Failed to fetch collateral information from blockchain');
    }
  }

  static async getDueAmount(contractAddress: string): Promise<DueAmountInfo> {
    try {
      const provider = this.initialize();
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
} 