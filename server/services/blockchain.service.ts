import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Define contract interfaces
interface RentalAgreementContract extends ethers.BaseContract {
  paySecurityDeposit(overrides?: { value: ethers.BigNumberish }): Promise<ethers.ContractTransactionResponse>;
  payRent(month: number, paymentMethod: number, overrides?: { value: ethers.BigNumberish }): Promise<ethers.ContractTransactionResponse>;
  skipRent(month: number): Promise<ethers.ContractTransactionResponse>;
  extendContractDuration(additionalMonths: number): Promise<ethers.ContractTransactionResponse>;
  getContractDetails(): Promise<any[]>;
}

interface RentalFactoryContract extends ethers.BaseContract {
  createAgreement(
    renterAddress: string,
    loanFactoryAddress: string,
    duration: number, 
    securityDeposit: ethers.BigNumberish,
    baseRent: ethers.BigNumberish,
    gracePeriod: number,
    name: string
  ): Promise<ethers.ContractTransactionResponse>;
}

interface LoanAgreementContract extends ethers.BaseContract {
  initializeLoan(overrides?: { value: ethers.BigNumberish }): Promise<ethers.ContractTransactionResponse>;
  makeRepayment(month: number, overrides?: { value: ethers.BigNumberish }): Promise<ethers.ContractTransactionResponse>;
  getRepaymentSchedule(): Promise<any[]>;
  getBorrower(): Promise<string>;
  getLender(): Promise<string>;
  getLoanAmount(): Promise<bigint>;
  getCollateralAmount(): Promise<bigint>;
  getStatus(): Promise<number>;
  calculateMonthlyPayment(): Promise<bigint>;
  lastPaidMonth(): Promise<bigint>;
  duration(): Promise<bigint>;
  graceMonths(): Promise<bigint>;
  interestRate(): Promise<bigint>;
}

interface LoanFactoryContract extends ethers.BaseContract {
  createLoanAgreement(
    borrowerAddress: string,
    rentalContractAddress: string,
    loanAmount: ethers.BigNumberish,
    interestRate: number,
    duration: number,
    graceMonths: number
  ): Promise<ethers.ContractTransactionResponse>;
}

// Load contract addresses
const contractAddressesPath = path.join(__dirname, '../../config/contractAddresses.json');
let contractAddresses: { rentalAgreementFactory: string, loanAgreementFactory: string };

try {
  const addressesRaw = fs.readFileSync(contractAddressesPath, 'utf8');
  contractAddresses = JSON.parse(addressesRaw);
} catch (error) {
  console.error('Failed to load contract addresses:', error);
  contractAddresses = {
    rentalAgreementFactory: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    loanAgreementFactory: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512'
  };
}

// Load contract ABIs
const loadArtifact = (contractName: string) => {
  try {
    const artifactPath = path.join(__dirname, `../../contracts/ABI/${contractName}.json`);
    const artifactRaw = fs.readFileSync(artifactPath, 'utf8');
    const parsedArtifact = JSON.parse(artifactRaw);
    
    // Return just the ABI part for ethers.js v6 compatibility
    return { 
      abi: parsedArtifact.abi || parsedArtifact 
    };
  } catch (error) {
    console.error(`Error loading artifact for ${contractName}:`, error);
    throw error;
  }
};

// Provider and contract instances
let provider: ethers.JsonRpcProvider;
let rentalFactoryContract: RentalFactoryContract;
let loanFactoryContract: LoanFactoryContract;

// Initialize provider and contracts
const initBlockchain = () => {
  try {
    provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    const RentalAgreementFactoryArtifact = loadArtifact('RentalAgreementFactory');
    const LoanAgreementFactoryArtifact = loadArtifact('LoanAgreementFactory');
    
    rentalFactoryContract = (new ethers.Contract(
      contractAddresses.rentalAgreementFactory,
      RentalAgreementFactoryArtifact.abi,
      provider
    ) as unknown) as RentalFactoryContract;
    
    loanFactoryContract = (new ethers.Contract(
      contractAddresses.loanAgreementFactory,
      LoanAgreementFactoryArtifact.abi,
      provider
    ) as unknown) as LoanFactoryContract;
    
    console.log('Blockchain service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize blockchain service:', error);
    throw error;
  }
};

// Get RentalAgreement Contract
export const getRentalAgreementContract = async (contractAddress: string): Promise<RentalAgreementContract> => {
  try {
    const RentalAgreementArtifact = loadArtifact('RentalAgreement');
    return (new ethers.Contract(
      contractAddress, 
      RentalAgreementArtifact.abi, 
      provider
    ) as unknown) as RentalAgreementContract;
  } catch (error) {
    console.error('Error getting rental agreement contract:', error);
    throw error;
  }
};

// Get RentalAgreement Details (Read-only)
export const getRentalAgreementDetails = async (contractAddress: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    
    // @ts-ignore - Contract method exists at runtime
    const details = await rentalContract.getContractDetails();
    
    return {
      landlord: details[0],
      renter: details[1],
      rentalDuration: Number(details[2]),
      securityDeposit: ethers.formatEther(details[3]),
      baseRent: ethers.formatEther(details[4]),
      status: Number(details[5]),
      startTime: new Date(Number(details[6]) * 1000),
      gracePeriod: Number(details[7])
    };
  } catch (error) {
    console.error('Error getting rental agreement details:', error);
    throw error;
  }
};

// Get Loan Agreement Contract
export const getLoanAgreementContract = async (contractAddress: string): Promise<LoanAgreementContract> => {
  try {
    const LoanAgreementArtifact = loadArtifact('LoanAgreement');
    return (new ethers.Contract(
      contractAddress, 
      LoanAgreementArtifact.abi, 
      provider
    ) as unknown) as LoanAgreementContract;
  } catch (error) {
    console.error('Error getting loan agreement contract:', error);
    throw error;
  }
};

// Get Loan Agreement Details (Read-only)
export const getLoanAgreementDetails = async (contractAddress: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    
    // Replace getContractDetails with individual getter methods
    // @ts-ignore - Contract method exists at runtime
    const borrower = await loanContract.getBorrower();
    // @ts-ignore - Contract method exists at runtime
    const lender = await loanContract.getLender();
    
    // @ts-ignore - Contract method exists at runtime
    const loanAmount = await loanContract.getLoanAmount();
    // @ts-ignore - Contract method exists at runtime
    const collateralAmount = await loanContract.getCollateralAmount();
    // @ts-ignore - Contract method exists at runtime
    const status = await loanContract.getStatus();
    // @ts-ignore - Contract method exists at runtime
    const monthlyPayment = await loanContract.calculateMonthlyPayment();
    // @ts-ignore - Contract method exists at runtime
    const lastPaid = await loanContract.lastPaidMonth();
    // @ts-ignore - Contract method exists at runtime
    const duration = await loanContract.duration();
    // @ts-ignore - Contract method exists at runtime
    const graceMonths = await loanContract.graceMonths();
    // @ts-ignore - Contract method exists at runtime
    const interestRate = await loanContract.interestRate();
    
    return {
      borrower,
      lender,
      loanAmount: ethers.formatEther(loanAmount),
      collateralAmount: ethers.formatEther(collateralAmount),
      status: Number(status),
      monthlyPayment: ethers.formatEther(monthlyPayment),
      lastPaidMonth: Number(lastPaid),
      duration: Number(duration),
      graceMonths: Number(graceMonths),
      interestRate: Number(interestRate)
    };
  } catch (error) {
    console.error('Error getting loan agreement details:', error);
    throw error;
  }
};

// Get Repayment Schedule (Read-only)
export const getRepaymentSchedule = async (contractAddress: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    
    // @ts-ignore - Contract method exists at runtime
    const repaymentSchedule = await loanContract.getRepaymentSchedule();
    const schedule = [];
    
    // repaymentSchedule[0] contains payment amounts
    // repaymentSchedule[1] contains month numbers
    const amountsArray = repaymentSchedule[0];
    const monthsArray = repaymentSchedule[1];
    
    // Make sure arrays are the same length
    const count = Math.min(amountsArray.length, monthsArray.length);
    
    for (let i = 0; i < count; i++) {
      // @ts-ignore - Contract method exists at runtime
      const isPaid = await loanContract.repaymentMade(monthsArray[i]);
      schedule.push({
        month: Number(monthsArray[i]),
        amount: ethers.formatEther(amountsArray[i]),
        isPaid
      });
    }
    
    return schedule;
  } catch (error) {
    console.error('Error getting repayment schedule:', error);
    throw error;
  }
};

// Get available collateral in a rental agreement (Read-only)
export const getAvailableCollateral = async (rentalContractAddress: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(rentalContractAddress);
    // @ts-ignore - Contract method exists at runtime
    const details = await rentalContract.getContractDetails();
    
    // Security deposit is at index 4 in the returned array
    const securityDeposit = ethers.formatEther(details[4]);
    
    return securityDeposit;
  } catch (error) {
    console.error('Error getting available collateral:', error);
    throw error;
  }
};

// Get loan details by combining contract data (Read-only)
export const getLoanDetails = async (contractAddress: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    
    // Get basic loan details
    const details = await getLoanAgreementDetails(contractAddress);
    
    // Get repayment schedule
    const schedule = await getRepaymentSchedule(contractAddress);
    
    return {
      ...details,
      repaymentSchedule: schedule
    };
  } catch (error) {
    console.error('Error getting loan details:', error);
    throw error;
  }
};

// Verify loan initialization transaction (Read-only)
export const verifyLoanInitialization = async (
  contractAddress: string,
  lenderWalletAddress: string,
  transactionHash: string
) => {
  try {
    // Get transaction details
    const tx = await provider.getTransaction(transactionHash);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Verify transaction is from the lender
    if (tx.from.toLowerCase() !== lenderWalletAddress.toLowerCase()) {
      return false;
    }
    
    // Verify transaction is to the loan contract
    if (tx.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying loan initialization:', error);
    return false;
  }
};

// Verify loan repayment transaction (Read-only)
export const verifyLoanRepayment = async (
  contractAddress: string,
  borrowerWalletAddress: string,
  monthNumber: number,
  transactionHash: string
) => {
  try {
    // Get transaction details
    const tx = await provider.getTransaction(transactionHash);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Verify transaction is from the borrower
    if (tx.from.toLowerCase() !== borrowerWalletAddress.toLowerCase()) {
      return false;
    }
    
    // Verify transaction is to the loan contract
    if (tx.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying loan repayment:', error);
    return false;
  }
};

// Initialize the blockchain service
initBlockchain();

export default {
  getRentalAgreementDetails,
  getLoanAgreementDetails,
  getRepaymentSchedule,
  getAvailableCollateral,
  getLoanDetails,
  verifyLoanInitialization,
  verifyLoanRepayment
}; 