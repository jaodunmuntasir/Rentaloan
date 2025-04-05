import { useState, useCallback, useEffect } from 'react';
import { ethers, Contract } from 'ethers';
import { useContracts } from '../contexts/ContractContext';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { RentalAgreementApi as RentalApi } from '../services/rental.service';
import { BlockchainService } from '../services/blockchain.service';

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
  gracePeriod: number;
  currentSecurityDeposit: string;
  name?: string;
  userRole?: string;
  landlordDetails?: any;
  renterDetails?: any;
  dueAmount: string;
  status: number;
  address: string;
  landlordAddress: string;
  tenantAddress: string;
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
      
      // First, always try to get blockchain data as it's the source of truth
      const contract = rentalContract || await initialize(contractAddress);
      if (!contract) return;
      
      let blockchainData = null;
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
        const currentSecurityDepositWei = details[7];
        const lastPaidMonth = Number(details[8]);
        const dueAmount = details[9];
        
        // Format eth values
        const securityDeposit = ethers.formatEther(securityDepositWei);
        const rentAmount = ethers.formatEther(baseRentWei);
        const currentSecurityDeposit = ethers.formatEther(currentSecurityDepositWei);
        
        // Store the blockchain data
        blockchainData = {
          landlord,
          tenant: renter,
          rentDuration,
          securityDeposit,
          rentAmount,
          gracePeriod: gracePeriodValue,
          status: statusValue,
          currentSecurityDeposit,
          lastPaidMonth,
          dueAmount: ethers.formatEther(dueAmount)
        };
        
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
          
          blockchainData = {
            landlord,
            tenant: renter,
            rentDuration,
            securityDeposit,
            rentAmount: baseRent,
            status
          };
        } catch (err) {
          console.error("Failed to read individual contract data:", err);
        }
      }
      
      if (!blockchainData) {
        setError("Failed to read blockchain data");
        return;
      }
      
      // Now get auxiliary data from API if user is logged in
      let apiData = null;
      if (currentUser) {
        try {
          const apiResponse = await RentalApi.getRentalAgreementDetails(currentUser, contractAddress);
          
          if (apiResponse && apiResponse.success) {
            const { agreement } = apiResponse;
            console.log("API data received:", agreement);
            apiData = {
              name: agreement.name,
              userRole: agreement.userRole,
              landlordDetails: agreement.landlord,
              renterDetails: agreement.renter
            };
          }
        } catch (apiError) {
          console.warn("API error, using only blockchain data:", apiError);
        }
      }
      
      // Default values for properties not in contract
      const propertyAddress = 'Property Address'; // Placeholder
      const propertyNftId = '0'; // Placeholder
      const paymentInterval = 30; // Monthly (30 days)
      
      // Determine status values
      const isActive = blockchainData.status === 1; // ACTIVE is 1
      const securityDepositPaid = blockchainData.status !== 0; // Not INITIALIZED (0)
      
      // Calculate next payment date based on last paid month
      const nextPaymentDate = new Date();
      if (blockchainData.lastPaidMonth !== undefined && blockchainData.lastPaidMonth >= 0) {
        nextPaymentDate.setTime(
          new Date().getTime() + ((blockchainData.lastPaidMonth + 1) * 30 * 24 * 60 * 60 * 1000)
        );
      }
      
      // Combine blockchain data (primary) with API data (auxiliary)
      setDetails({
        // Core blockchain data
        landlord: blockchainData.landlord,
        tenant: blockchainData.tenant,
        propertyAddress,
        propertyNftId,
        rentAmount: blockchainData.rentAmount,
        securityDeposit: blockchainData.securityDeposit,
        rentDuration: blockchainData.rentDuration,
        paymentInterval,
        nextPaymentDate,
        isActive,
        securityDepositPaid,
        currentRentPaid: (blockchainData.lastPaidMonth ?? 0) > 0,
        currentMonth: blockchainData.lastPaidMonth ?? 0,
        lastPaidMonth: blockchainData.lastPaidMonth ?? 0,
        dueAmount: blockchainData.dueAmount ?? "0.0",
        status: blockchainData.status,
        
        // Additional blockchain data
        gracePeriod: blockchainData.gracePeriod ?? Math.floor(Number(blockchainData.securityDeposit) / Number(blockchainData.rentAmount)),
        currentSecurityDeposit: blockchainData.currentSecurityDeposit ?? blockchainData.securityDeposit,
        
        // Auxiliary information from API if available
        ...(apiData && {
          name: apiData.name,
          userRole: apiData.userRole,
          landlordDetails: apiData.landlordDetails,
          renterDetails: apiData.renterDetails
        }),
        
        // New fields from BlockchainService
        address: contractAddress,
        landlordAddress: blockchainData.landlord,
        tenantAddress: blockchainData.tenant
      });
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
      
      // Ensure values are treated as BigNumber objects
      const baseRentBN = ethers.getBigInt(baseRent.toString());
      const dueAmountBN = ethers.getBigInt(dueAmount.toString());
      const totalAmount = baseRentBN + dueAmountBN;
      
      console.log(`Paying rent for month ${month}, amount: ${ethers.formatEther(totalAmount)} ETH`);
      
      // Use PaymentMethod.WALLET (0) for direct payment
      const tx = await rentalContract.payRent(month, 0, { 
        value: totalAmount
      });
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Get rent duration to check if this is the last month
      const rentDuration = await rentalContract.rentalDuration();
      const isLastMonth = month === Number(rentDuration);
      
      // Update backend
      if (currentUser) {
        await RentalApi.payRent(
          currentUser,
          contractAddress,
          ethers.formatEther(totalAmount),
          receipt.hash,
          month
        );
        
        // If this is the last month, update status to CLOSED in database
        if (isLastMonth) {
          console.log("Last month paid, updating rental agreement status to CLOSED");
          await RentalApi.updateStatusToClosed(
            currentUser,
            contractAddress
          );
        }
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
      const tx = await rentalContract.skipRent(month);
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Update backend
      if (currentUser) {
        await RentalApi.skipRent(
          currentUser,
          contractAddress,
          month,
          receipt.hash
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

export const useRentalAgreementByAddress = (contractAddress: string) => {
  const { currentUser } = useAuth();
  const [details, setDetails] = useState<RentalAgreementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRentalAgreement = async () => {
      if (!contractAddress || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get rental agreement details from blockchain
        const rentalDetails = await BlockchainService.getRentalAgreementDetails(contractAddress);
        
        // Get available collateral (which would be the security deposit or any remaining funds)
        const collateralInfo = await BlockchainService.getAvailableCollateral(contractAddress);
        
        // Get amount due for next payment
        const dueAmountInfo = await BlockchainService.getDueAmount(contractAddress);

        const agreementDetails: RentalAgreementDetails = {
          // Required properties from interface
          landlord: rentalDetails.landlord || '',
          tenant: rentalDetails.tenant || '',
          propertyAddress: 'Property address not available',
          propertyNftId: '0',
          rentAmount: rentalDetails.rentAmount || '0',
          securityDeposit: collateralInfo.availableAmount || '0',
          rentDuration: rentalDetails.rentDuration || 0,
          paymentInterval: 30, // Default: monthly (30 days)
          nextPaymentDate: new Date(),
          isActive: rentalDetails.isActive || false,
          securityDepositPaid: true, // Assume paid if we can see the agreement
          currentRentPaid: false,
          gracePeriod: 3, // Default grace period
          currentSecurityDeposit: collateralInfo.availableAmount || '0',
          dueAmount: dueAmountInfo.dueAmount || '0',
          status: rentalDetails.isActive ? 1 : 0, // Active = 1, Inactive = 0
          address: contractAddress,
          landlordAddress: rentalDetails.landlord || '',
          tenantAddress: rentalDetails.tenant || '',
          
          // Optional properties
          name: `Rental Agreement #${contractAddress.substring(0, 6)}`,
          lastPaidMonth: rentalDetails.lastPaidMonth || 0
        };

        setDetails(agreementDetails);
      } catch (err) {
        console.error('Error fetching rental agreement:', err);
        setError('Failed to load rental agreement details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRentalAgreement();
  }, [contractAddress, currentUser]);

  return { details, loading, error };
}; 