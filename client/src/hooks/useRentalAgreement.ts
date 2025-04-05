import { useState, useCallback, useEffect } from 'react';
import { ethers, Contract } from 'ethers';
import { useContracts } from '../contexts/ContractContext';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { RentalAgreementApi as RentalApi } from '../services/rental.service';

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
  currentMonth?: number;
  lastPaidMonth?: number;
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
      
      // Fetch rental details from API first
      if (currentUser) {
        try {
          const apiResponse = await RentalApi.getRentalAgreementDetails(currentUser, contractAddress);
          
          if (apiResponse && apiResponse.success) {
            const { agreement } = apiResponse;
            
            // Extract blockchain data if available, otherwise use database data
            const onChain = agreement.onChain || {};
            
            // Convert to RentalAgreementDetails format
            const landlordAddress = onChain.landlord || agreement.landlord?.walletAddress || '';
            const tenantAddress = onChain.renter || agreement.renter?.walletAddress || '';
            
            setDetails({
              landlord: landlordAddress,
              tenant: tenantAddress,
              propertyAddress: 'Property Address', // Placeholder
              propertyNftId: '0', // Placeholder
              rentAmount: onChain.baseRent || agreement.baseRent || '0',
              securityDeposit: onChain.securityDeposit || agreement.securityDeposit || '0',
              rentDuration: onChain.duration || agreement.duration || 0,
              paymentInterval: 30, // Default to monthly
              nextPaymentDate: new Date(), // Placeholder
              isActive: onChain.status === 1 || agreement.status === 'ACTIVE',
              securityDepositPaid: onChain.status !== 0,
              currentRentPaid: false, // Placeholder
              currentMonth: onChain.lastPaidMonth || 0,
              lastPaidMonth: onChain.lastPaidMonth || 0
            });
            
            return;
          }
        } catch (apiError) {
          console.error("API error, falling back to blockchain:", apiError);
          // Continue with blockchain call if API fails
        }
      }
      
      // Fallback to blockchain if API fails or user not logged in
      const contract = rentalContract || await initialize(contractAddress);
      if (!contract) return;
      
      try {
        // Use getContractDetails() to get all data in one call
        const details = await contract.getContractDetails();
        
        // Extract values from the returned tuple
        const landlord = details[0];
        const renter = details[1];
        const rentDuration = Number(details[2]);
        const securityDepositWei = details[3];
        const baseRentWei = details[4];
        const gracePeriodValue = Number(details[5]);
        const statusValue = Number(details[6]);
        const currentSecurityDeposit = details[7];
        const lastPaidMonth = Number(details[8]);
        const dueAmount = details[9];
        
        // Format eth values
        const securityDeposit = ethers.formatEther(securityDepositWei);
        const rentAmount = ethers.formatEther(baseRentWei);
        
        // Default values for properties not in contract
        const propertyAddress = 'Property Address'; // Placeholder
        const propertyNftId = '0'; // Placeholder
        const paymentInterval = 30; // Monthly (30 days)
        
        // Determine status values
        const isActive = statusValue === 1; // ACTIVE is 1
        const securityDepositPaid = statusValue !== 0; // Not INITIALIZED (0)
        
        // Calculate next payment date based on last paid month
        const nextPaymentDate = new Date();
        if (lastPaidMonth >= 0) {
          nextPaymentDate.setTime(
            new Date().getTime() + ((lastPaidMonth + 1) * 30 * 24 * 60 * 60 * 1000)
          );
        }
        
        setDetails({
          landlord,
          tenant: renter,
          propertyAddress,
          propertyNftId,
          rentAmount,
          securityDeposit,
          rentDuration,
          paymentInterval,
          nextPaymentDate,
          isActive,
          securityDepositPaid,
          currentRentPaid: lastPaidMonth > 0,
          currentMonth: lastPaidMonth,
          lastPaidMonth
        });
      } catch (contractErr) {
        console.error("Error fetching contract details:", contractErr);
        
        // If getContractDetails fails, try individual property calls as fallback
        try {
          const landlord = await contract.landlord();
          const renter = await contract.renter();
          const rentDuration = Number(await contract.rentalDuration());
          const securityDeposit = ethers.formatEther(await contract.securityDeposit());
          const baseRent = ethers.formatEther(await contract.getBaseRent());
          const status = Number(await contract.getContractStatus());
          
          setDetails({
            landlord,
            tenant: renter,
            propertyAddress: 'Property Address', // Placeholder
            propertyNftId: '0', // Placeholder
            rentAmount: baseRent,
            securityDeposit,
            rentDuration,
            paymentInterval: 30, // Default to monthly
            nextPaymentDate: new Date(), // Placeholder
            isActive: status === 1, // ACTIVE status
            securityDepositPaid: status !== 0, // Not INITIALIZED
            currentRentPaid: false, // Placeholder
            currentMonth: 0,
            lastPaidMonth: 0
          });
        } catch (err) {
          setError("Failed to read contract data: " + (err instanceof Error ? err.message : String(err)));
        }
      }
    } catch (err: any) {
      setError(err.message || "Error loading rental details");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, initialize, rentalContract, currentUser]);
  
  // Pay security deposit
  const paySecurityDeposit = useCallback(async () => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get security deposit amount - must match the exact contract property name
      const depositAmount = await rentalContract.securityDeposit();
      console.log("Security deposit amount:", depositAmount.toString());
      
      // Send transaction with the security deposit amount as value
      const tx = await rentalContract.paySecurityDeposit({ 
        value: depositAmount 
      });
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
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
      console.error("Security deposit payment error:", err);
      setError(err.message || "Error paying security deposit");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, rentalContract, isConnected, loadDetails, currentUser]);
  
  // Pay rent
  const payRent = useCallback(async (month: number) => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get rent amount and any due amount
      const baseRent = await rentalContract.getBaseRent();
      const dueAmount = await rentalContract.dueAmount();
      const totalAmount = baseRent.add(dueAmount);
      
      console.log(`Paying rent for month ${month}, amount: ${ethers.formatEther(totalAmount)} ETH`);
      
      // Use PaymentMethod.WALLET (0) for direct payment
      const tx = await rentalContract.payRent(month, 0, { 
        value: totalAmount
      });
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Update backend
      if (currentUser) {
        await RentalApi.payRent(
          currentUser,
          contractAddress,
          ethers.formatEther(totalAmount),
          receipt.hash
        );
      }
      
      // Refresh details
      await loadDetails();
      
      return receipt;
    } catch (err: any) {
      console.error("Rent payment error:", err);
      setError(err.message || "Error paying rent");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractAddress, rentalContract, isConnected, loadDetails, currentUser]);
  
  // Skip rent payment 
  const skipRent = useCallback(async (month: number) => {
    if (!contractAddress || !rentalContract || !isConnected) {
      setError("Contract not initialized or wallet not connected");
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Skipping rent for month ${month}`);
      
      // Send transaction to skip rent for the specified month
      const tx = await rentalContract.skipRentPayment(month);
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
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
      console.error("Skip rent error:", err);
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
  
  // Initialize and load details when address is provided
  useEffect(() => {
    if (contractAddress) {
      const initAndLoad = async () => {
        try {
          // Initialize the contract if needed
          if (!rentalContract) {
            await initialize(contractAddress);
          }
          // Load the details
          await loadDetails();
        } catch (err) {
          console.error("Error initializing rental agreement:", err);
        }
      };
      
      initAndLoad();
    }
  }, [contractAddress, rentalContract, initialize, loadDetails]);
  
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