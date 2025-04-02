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
  getContractDetails(): Promise<any[]>;
  getRepaymentSchedule(): Promise<any[]>;
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
    const artifactPath = path.join(__dirname, `../../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const artifactRaw = fs.readFileSync(artifactPath, 'utf8');
    return JSON.parse(artifactRaw);
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

// Create RentalAgreement Contract
export const createRentalAgreement = async (
  landlordWallet: string,
  renterAddress: string,
  duration: number,
  securityDeposit: string,
  baseRent: string,
  gracePeriod: number,
  name: string
) => {
  try {
    const signer = await provider.getSigner(landlordWallet);
    const connectedContract = rentalFactoryContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.createAgreement(
      renterAddress,
      contractAddresses.loanAgreementFactory,
      duration,
      ethers.parseEther(securityDeposit),
      ethers.parseEther(baseRent),
      gracePeriod,
      name
    );
    
    const receipt = await tx.wait();
    
    // Get contract address from event logs
    const eventLogs = receipt.logs
      .filter((log: any) => log.topics[0] === ethers.id('AgreementCreated(address,address,address,string)'))
      .map((log: any) => {
        const parsedLog = rentalFactoryContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsedLog?.args;
      });
    
    if (!eventLogs || eventLogs.length === 0 || !eventLogs[0]) {
      throw new Error('Failed to parse event logs from transaction receipt');
    }

    const event = eventLogs[0];
    
    return {
      contractAddress: event[0],
      landlord: event[1],
      renter: event[2],
      name: event[3],
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error creating rental agreement:', error);
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

// Pay Security Deposit
export const paySecurityDeposit = async (contractAddress: string, renterWallet: string, amount: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    const signer = await provider.getSigner(renterWallet);
    const connectedContract = rentalContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.paySecurityDeposit({
      value: ethers.parseEther(amount)
    });
    
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error paying security deposit:', error);
    throw error;
  }
};

// Pay Rent
export const payRent = async (contractAddress: string, renterWallet: string, month: number, amount: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    const signer = await provider.getSigner(renterWallet);
    const connectedContract = rentalContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.payRent(month, 0, { // 0 for PaymentMethod.WALLET
      value: ethers.parseEther(amount)
    });
    
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error paying rent:', error);
    throw error;
  }
};

// Skip Rent
export const skipRent = async (contractAddress: string, renterWallet: string, month: number) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    const signer = await provider.getSigner(renterWallet);
    const connectedContract = rentalContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.skipRent(month);
    
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error skipping rent:', error);
    throw error;
  }
};

// Extend Rental Agreement
export const extendRentalAgreement = async (contractAddress: string, landlordWallet: string, additionalMonths: number) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    const signer = await provider.getSigner(landlordWallet);
    const connectedContract = rentalContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.extendContractDuration(additionalMonths);
    
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error extending rental agreement:', error);
    throw error;
  }
};

// Get Rental Agreement Details
export const getRentalAgreementDetails = async (contractAddress: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    const details = await rentalContract.getContractDetails();
    
    return {
      landlord: details[0],
      renter: details[1],
      duration: Number(details[2]),
      securityDeposit: ethers.formatEther(details[3]),
      baseRent: ethers.formatEther(details[4]),
      gracePeriod: Number(details[5]),
      status: details[6], // ContractStatus enum (0 = INITIALIZED, 1 = ACTIVE, 2 = CLOSED)
      currentSecurityDeposit: ethers.formatEther(details[7]),
      lastPaidMonth: Number(details[8]),
      dueAmount: ethers.formatEther(details[9])
    };
  } catch (error) {
    console.error('Error getting rental agreement details:', error);
    throw error;
  }
};

// LOAN RELATED FUNCTIONS

// Create Loan Agreement
export const createLoanAgreement = async (
  lenderWallet: string,
  borrowerAddress: string,
  rentalContractAddress: string,
  loanAmount: string,
  interestRate: number,
  duration: number,
  graceMonths: number
) => {
  try {
    const signer = await provider.getSigner(lenderWallet);
    const connectedContract = loanFactoryContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.createLoanAgreement(
      borrowerAddress,
      rentalContractAddress,
      ethers.parseEther(loanAmount),
      interestRate,
      duration,
      graceMonths
    );
    
    const receipt = await tx.wait();
    
    // Get contract address from event logs
    const eventLogs = receipt.logs
      .filter((log: any) => log.topics[0] === ethers.id('LoanAgreementCreated(address,address,address,address)'))
      .map((log: any) => {
        const parsedLog = loanFactoryContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsedLog?.args;
      });
    
    if (!eventLogs || eventLogs.length === 0 || !eventLogs[0]) {
      throw new Error('Failed to parse event logs from transaction receipt');
    }

    const event = eventLogs[0];
    
    return {
      contractAddress: event[0],
      lender: event[1],
      borrower: event[2],
      rentalContract: event[3],
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error creating loan agreement:', error);
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

// Initialize Loan (Lender funds the loan)
export const initializeLoan = async (contractAddress: string, lenderWallet: string, amount: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    const signer = await provider.getSigner(lenderWallet);
    const connectedContract = loanContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.initializeLoan({
      value: ethers.parseEther(amount)
    });
    
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error initializing loan:', error);
    throw error;
  }
};

// Make Loan Repayment
export const makeRepayment = async (contractAddress: string, borrowerWallet: string, month: number, amount: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    const signer = await provider.getSigner(borrowerWallet);
    const connectedContract = loanContract.connect(signer);
    
    // @ts-ignore - Contract method exists at runtime
    const tx = await connectedContract.makeRepayment(month, {
      value: ethers.parseEther(amount)
    });
    
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error making loan repayment:', error);
    throw error;
  }
};

// Get Loan Agreement Details
export const getLoanAgreementDetails = async (contractAddress: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    
    // @ts-ignore - Contract method exists at runtime
    const details = await loanContract.getContractDetails();
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

// Get Repayment Schedule
export const getRepaymentSchedule = async (contractAddress: string) => {
  try {
    const loanContract = await getLoanAgreementContract(contractAddress);
    
    // @ts-ignore - Contract method exists at runtime
    const repaymentSchedule = await loanContract.getRepaymentSchedule();
    const schedule = [];
    
    for (let i = 1; i <= repaymentSchedule.length; i++) {
      // @ts-ignore - Contract method exists at runtime
      const isPaid = await loanContract.repaymentMade(i);
      schedule.push({
        month: i,
        amount: ethers.formatEther(repaymentSchedule[i - 1]),
        isPaid
      });
    }
    
    return schedule;
  } catch (error) {
    console.error('Error getting repayment schedule:', error);
    throw error;
  }
};

// Get Available Collateral
export const getAvailableCollateral = async (rentalContractAddress: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(rentalContractAddress);
    
    // @ts-ignore - Contract method exists at runtime
    const collateral = await rentalContract.getAvailableCollateral();
    return ethers.formatEther(collateral);
  } catch (error) {
    console.error('Error getting available collateral:', error);
    throw error;
  }
};

// Initialize the blockchain service when imported
initBlockchain();

export default {
  createRentalAgreement,
  paySecurityDeposit,
  payRent,
  skipRent,
  extendRentalAgreement,
  getRentalAgreementDetails,
  
  // Loan functions
  createLoanAgreement,
  initializeLoan,
  makeRepayment,
  getLoanAgreementDetails,
  getRepaymentSchedule,
  getAvailableCollateral
}; 