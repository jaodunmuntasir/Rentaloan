import { useState, useCallback } from 'react';
import { ethers, Contract } from 'ethers';
import { useContracts } from '../contexts/ContractContext';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { RentalApi } from '../services/api.service';

interface RentalAgreementDetails {
  landlord: string;
  tenant: string;
  propertyAddress: string;
  propertyNftId: string;
  rentAmount: string;
  securityDeposit: string;
  rentDuration: number;
  paymentInterval: number;
  nextPaymentDate: Date;
  isActive: boolean;
  securityDepositPaid: boolean;
  currentRentPaid: boolean;
}

export function useRentalAgreement(contractAddress?: string) {
  const [rentalContract, setRentalContract] = useState<Contract | null>(null);
  const [details, setDetails] = useState<RentalAgreementDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getRentalContract } = useContracts();
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
      
      const contract = await getRentalContract(address);
      if (contract) {
        setRentalContract(contract);
        return contract;
      } else {
        setError("Failed to initialize rental contract");
        return null;
      }
    } catch (err: any) {
      setError(err.message || "Error initializing contract");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getRentalContract, isConnected, signer]);
  
  // Load rental agreement details
  const loadDetails = useCallback(async () => {
    if (!contractAddress) {
      setError("Contract address not provided");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Initialize contract if not already done
      const contract = rentalContract || await initialize(contractAddress);
      if (!contract) return;
      
      // Get contract data from blockchain
      const landlord = await contract.landlord();
      const tenant = await contract.tenant();
      const propertyAddress = await contract.propertyAddress();
      const propertyNftId = await contract.propertyNftId();
      const rentAmount = ethers.formatEther(await contract.rentAmount());
      const securityDeposit = ethers.formatEther(await contract.securityDeposit());
      const rentDuration = Number(await contract.rentDuration());
      const paymentInterval = Number(await contract.paymentInterval());
      const nextPaymentTimestamp = Number(await contract.nextPaymentDate()) * 1000; // Convert to milliseconds
      const nextPaymentDate = new Date(nextPaymentTimestamp);
      const isActive = await contract.isActive();
      const securityDepositPaid = await contract.securityDepositPaid();
      const currentRentPaid = await contract.currentRentPaid();
      
      setDetails({
        landlord,
        tenant,
        propertyAddress,
        propertyNftId,
        rentAmount,
        securityDeposit,
        rentDuration,
        paymentInterval,
        nextPaymentDate,
        isActive,
        securityDepositPaid,
        currentRentPaid
      });
    } catch (err: any) {
      setError(err.message || "Error loading rental details");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, initialize, rentalContract]);
  
  // Pay security deposit
  const paySecurityDeposit = useCallback(async () => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get security deposit amount
      const depositAmount = await rentalContract.securityDeposit();
      
      // Send transaction
      const tx = await rentalContract.paySecurityDeposit({
        value: depositAmount
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update backend
      if (currentUser) {
        await RentalApi.paySecurityDeposit(
          currentUser,
          contractAddress,
          receipt.hash
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error paying security deposit");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, rentalContract, isConnected, loadDetails, currentUser]);
  
  // Pay rent
  const payRent = useCallback(async () => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get rent amount
      const rentAmount = await rentalContract.rentAmount();
      
      // Send transaction
      const tx = await rentalContract.payRent({
        value: rentAmount
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update backend
      if (currentUser) {
        await RentalApi.payRent(
          currentUser,
          contractAddress,
          ethers.formatEther(rentAmount),
          receipt.hash
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error paying rent");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, rentalContract, isConnected, loadDetails, currentUser]);
  
  // Skip rent payment (for landlord)
  const skipRent = useCallback(async () => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Send transaction
      const tx = await rentalContract.skipRentPayment();
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update backend
      if (currentUser) {
        await RentalApi.skipRent(
          currentUser,
          contractAddress
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error skipping rent");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, rentalContract, isConnected, loadDetails, currentUser]);
  
  // Extend rental agreement
  const extendRental = useCallback(async (additionalMonths: number) => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Send transaction
      const tx = await rentalContract.extendRentalPeriod(additionalMonths);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update backend
      if (currentUser) {
        await RentalApi.extendRental(
          currentUser,
          contractAddress,
          additionalMonths,
          receipt.hash
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      setError(err.message || "Error extending rental period");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, rentalContract, isConnected, loadDetails, currentUser]);
  
  // Initialize when address is provided
  useCallback(() => {
    if (contractAddress && !rentalContract) {
      initialize(contractAddress);
    }
  }, [contractAddress, rentalContract, initialize]);
  
  return {
    rentalContract,
    details,
    loading,
    error,
    initialize,
    loadDetails,
    paySecurityDeposit,
    payRent,
    skipRent,
    extendRental
  };
} 