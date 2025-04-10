import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAuth } from './AuthContext';
import { setupDebugHelpers } from '../utils/debugHelpers';

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

  // Auto-connect/disconnect wallet when user logs in/out
  useEffect(() => {
    const handleUserChange = async () => {
      if (currentUser && provider) {
        // User logged in - connect wallet
        console.log("User logged in, auto-connecting wallet...");
        await connectWallet();
      } else if (!currentUser) {
        // User logged out - disconnect wallet
        console.log("User logged out, disconnecting wallet...");
        disconnectWallet();
      }
    };

    handleUserChange();
  }, [currentUser, provider]); // Re-run when user or provider changes

  // Connect to wallet
  const connectWallet = async (): Promise<boolean> => {
    if (!provider || !currentUser) {
      console.log("Cannot connect: provider or currentUser is null");
      return false;
    }

    try {
      console.log("Connecting wallet...");
      
      // Get user's profile to get their wallet address
      const idToken = await currentUser.getIdToken();
      console.log("Got token, fetching profile...");
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        console.error("Profile fetch failed:", response.status, response.statusText);
        throw new Error(`Failed to get user profile: ${response.status}`);
      }
      
      const profileData = await response.json();
      console.log("Got profile data:", profileData);
      
      const userWalletAddress = profileData.walletAddress;
      if (!userWalletAddress) {
        console.error('User has no wallet address assigned');
        return false;
      }
      
      console.log("Using wallet address:", userWalletAddress);
      
      // Connect to the user's assigned wallet
      try {
        const accounts = await provider.listAccounts();
        console.log("Available accounts:", accounts.map(a => a.address));
        
        const connectedSigner = await provider.getSigner(userWalletAddress);
        console.log("Got signer");
        
        setSigner(connectedSigner);
        
        // Get address and update state
        const address = await connectedSigner.getAddress();
        console.log("Connected to address:", address);
        
        setWalletAddress(address);
        
        // Get balance
        const balance = await provider.getBalance(address);
        setWalletBalance(ethers.formatEther(balance));
        console.log("Wallet balance:", ethers.formatEther(balance));
        
        setIsConnected(true);
        console.log("Wallet connected successfully");
        
        // Setup debug helpers in the console
        setupDebugHelpers(connectedSigner);
        
        return true;
      } catch (signerError) {
        console.error("Error getting signer:", signerError);
        
        // Fallback to first account if user's wallet is not available
        console.log("Trying fallback to first available account...");
        const accounts = await provider.listAccounts();
        if (accounts.length === 0) {
          console.error('No accounts available');
          return false;
        }
        
        // Use first account
        const connectedSigner = await provider.getSigner(accounts[0].address);
        setSigner(connectedSigner);
        
        const address = await connectedSigner.getAddress();
        setWalletAddress(address);
        
        const balance = await provider.getBalance(address);
        setWalletBalance(ethers.formatEther(balance));
        
        setIsConnected(true);
        console.log("Connected via fallback to:", address);
        
        // Update the user's wallet address in the backend
        await updateWalletAddress(address);
        
        // Setup debug helpers in the console
        setupDebugHelpers(connectedSigner);
        
        return true;
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    console.log("Disconnecting wallet");
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
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/user/profile`, {
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