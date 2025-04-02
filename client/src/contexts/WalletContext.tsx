import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAuth } from './AuthContext';

interface WalletContextType {
  provider: ethers.JsonRpcProvider | null;
  signer: ethers.Signer | null;
  walletAddress: string | null;
  walletBalance: string | null;
  isConnected: boolean;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  updateWalletAddress: (address: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { currentUser } = useAuth();
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        // Connect to local Hardhat node
        const newProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        await newProvider.getBlockNumber(); // Verify connection
        setProvider(newProvider);
      } catch (error) {
        console.error('Failed to connect to Ethereum provider:', error);
      }
    };

    initProvider();
  }, []);

  // Connect to wallet
  const connectWallet = async (): Promise<boolean> => {
    if (!provider || !currentUser) return false;

    try {
      // For development, just use the first account from Hardhat
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        console.error('No accounts available in the Hardhat node');
        return false;
      }

      // Use first account for dev purposes
      const connectedSigner = await provider.getSigner(accounts[0].address);
      setSigner(connectedSigner);
      
      // Get address and update state
      const address = await connectedSigner.getAddress();
      setWalletAddress(address);
      
      // Get balance
      const balance = await provider.getBalance(address);
      setWalletBalance(ethers.formatEther(balance));
      
      setIsConnected(true);
      
      // Update user's wallet address in the backend
      await updateWalletAddress(address);
      
      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setSigner(null);
    setWalletAddress(null);
    setWalletBalance(null);
    setIsConnected(false);
  };

  // Update wallet address in backend
  const updateWalletAddress = async (address: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update wallet address');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating wallet address:', error);
      return false;
    }
  };

  // Update balance periodically
  useEffect(() => {
    if (!isConnected || !walletAddress || !provider) return;
    
    const updateBalance = async () => {
      try {
        const balance = await provider.getBalance(walletAddress);
        setWalletBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('Error updating balance:', error);
      }
    };
    
    // Update balance initially
    updateBalance();
    
    // Set interval to update balance every 15 seconds
    const interval = setInterval(updateBalance, 15000);
    
    return () => clearInterval(interval);
  }, [isConnected, walletAddress, provider]);

  const value = {
    provider,
    signer,
    walletAddress,
    walletBalance,
    isConnected,
    connectWallet,
    disconnectWallet,
    updateWalletAddress
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}; 