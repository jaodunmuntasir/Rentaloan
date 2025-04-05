import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers, Contract } from 'ethers';
import { useWallet } from './WalletContext';

// Import ABIs
import RentalAgreementFactoryABI from '../contracts/ABI/RentalAgreementFactory.json';
import RentalAgreementABI from '../contracts/ABI/RentalAgreement.json';
import LoanAgreementFactoryABI from '../contracts/ABI/LoanAgreementFactory.json';
import LoanAgreementABI from '../contracts/ABI/LoanAgreement.json';

// Contract addresses - these would typically come from environment variables or a config file
const CONTRACT_ADDRESSES = {
  RENTAL_FACTORY: process.env.REACT_APP_RENTAL_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  LOAN_FACTORY: process.env.REACT_APP_LOAN_FACTORY_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
};

interface ContractContextType {
  rentalFactory: Contract | null;
  loanFactory: Contract | null;
  getRentalContract: (address: string) => Promise<Contract | null>;
  getLoanContract: (address: string) => Promise<Contract | null>;
  createRentalAgreement: (
    tenant: string,
    duration: number,
    securityDeposit: string,
    baseRent: string,
    gracePeriod: number,
    name: string
  ) => Promise<{ contractAddress: string, transactionHash: string } | null>;
  createLoanAgreement: (params: CreateLoanParams) => Promise<string | null>;
}

interface CreateLoanParams {
  borrower: string;
  rentalAddress: string;
  loanAmount: string;
  interestRate: number;
  loanDuration: number;
  graceMonths: number;
}

const ContractContext = createContext<ContractContextType | null>(null);

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContracts must be used within a ContractProvider');
  }
  return context;
};

export const ContractProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { provider, signer, isConnected } = useWallet();
  const [rentalFactory, setRentalFactory] = useState<Contract | null>(null);
  const [loanFactory, setLoanFactory] = useState<Contract | null>(null);

  // Initialize contract instances when wallet is connected
  useEffect(() => {
    const initContracts = async () => {
      if (!provider || !signer || !isConnected) {
        setRentalFactory(null);
        setLoanFactory(null);
        return;
      }

      try {
        // Initialize rental factory contract
        const rentalFactoryContract = new ethers.Contract(
          CONTRACT_ADDRESSES.RENTAL_FACTORY,
          RentalAgreementFactoryABI,
          signer
        );
        setRentalFactory(rentalFactoryContract);

        // Initialize loan factory contract
        const loanFactoryContract = new ethers.Contract(
          CONTRACT_ADDRESSES.LOAN_FACTORY,
          LoanAgreementFactoryABI,
          signer
        );
        setLoanFactory(loanFactoryContract);
      } catch (error) {
        console.error('Error initializing contracts:', error);
      }
    };

    initContracts();
  }, [provider, signer, isConnected]);

  // Get a rental agreement contract instance by address
  const getRentalContract = async (address: string): Promise<Contract | null> => {
    if (!provider || !signer || !isConnected) return null;

    try {
      return new ethers.Contract(
        address,
        RentalAgreementABI,
        signer
      );
    } catch (error) {
      console.error('Error getting rental contract:', error);
      return null;
    }
  };

  // Get a loan agreement contract instance by address
  const getLoanContract = async (address: string): Promise<Contract | null> => {
    if (!provider || !signer || !isConnected) return null;

    try {
      return new ethers.Contract(
        address,
        LoanAgreementABI,
        signer
      );
    } catch (error) {
      console.error('Error getting loan contract:', error);
      return null;
    }
  };

  // Create a rental agreement
  const createRentalAgreement = async (
    tenant: string,
    duration: number,
    securityDeposit: string,
    baseRent: string,
    gracePeriod: number,
    name: string
  ): Promise<{ contractAddress: string, transactionHash: string } | null> => {
    if (!rentalFactory || !signer) return null;

    try {
      const baseRentWei = ethers.parseEther(baseRent);
      const securityDepositWei = ethers.parseEther(securityDeposit);

      console.log("Creating rental agreement with params:", {
        tenant,
        loanFactory: CONTRACT_ADDRESSES.LOAN_FACTORY,
        duration,
        securityDepositWei: securityDepositWei.toString(),
        baseRentWei: baseRentWei.toString(),
        gracePeriod,
        name
      });

      // The createAgreement function returns the address directly
      const contractAddress = await rentalFactory.createAgreement.staticCall(
        tenant,
        CONTRACT_ADDRESSES.LOAN_FACTORY,
        duration,
        securityDepositWei,
        baseRentWei,
        gracePeriod,
        name
      );
      
      console.log("Simulated contract address:", contractAddress);
      
      // Now execute the actual transaction
      const tx = await rentalFactory.createAgreement(
        tenant,
        CONTRACT_ADDRESSES.LOAN_FACTORY,
        duration,
        securityDepositWei,
        baseRentWei,
        gracePeriod,
        name
      );

      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      
      // Return the simulated contract address and transaction hash
      return { contractAddress, transactionHash: tx.hash };
    } catch (error) {
      console.error('Error creating rental agreement:', error);
      throw new Error('Failed to create rental agreement on the blockchain');
    }
  };

  // Create a loan agreement
  const createLoanAgreement = async (params: CreateLoanParams): Promise<string | null> => {
    if (!loanFactory || !signer) return null;

    try {
      const loanAmountWei = ethers.parseEther(params.loanAmount);
      const interestRateBps = Math.floor(params.interestRate * 100); // Convert percent to basis points

      const tx = await loanFactory.createLoanAgreement(
        params.borrower,
        params.rentalAddress,
        loanAmountWei,
        interestRateBps,
        params.loanDuration,
        params.graceMonths
      );

      const receipt = await tx.wait();
      
      // Extract the created contract address from events
      const event = receipt.logs
        .filter((log: any) => 
          log.topics[0] === loanFactory.getEvent('LoanAgreementCreated').fragment.topicHash
        )
        .map((log: any) => loanFactory.interface.parseLog(log))
        [0];
      
      return event.args.contractAddress;
    } catch (error) {
      console.error('Error creating loan agreement:', error);
      return null;
    }
  };

  const value = {
    rentalFactory,
    loanFactory,
    getRentalContract,
    getLoanContract,
    createRentalAgreement,
    createLoanAgreement,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
}; 