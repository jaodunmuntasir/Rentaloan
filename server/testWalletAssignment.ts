import { ethers } from "ethers";
import db from "./models";
import { User } from "./models/user.model";

// Get a Hardhat wallet from our local node
const getAvailableWallet = async (): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    console.log("Connected to RPC provider");
    
    const accounts = await provider.listAccounts();
    console.log(`Found ${accounts.length} accounts`);
    
    // Print the first few accounts for debugging
    accounts.slice(0, 5).forEach((account, index) => {
      console.log(`Account ${index}: ${account.address}`);
    });
    
    const usedAddresses = await User.findAll({ attributes: ["walletAddress"] });
    console.log(`Found ${usedAddresses.length} used wallet addresses in database`);
    
    const usedAddressSet = new Set(
      usedAddresses.map((u) => u.walletAddress.toLowerCase())
    );

    // Find the first available account that isn't already assigned
    const availableAccount = accounts.find(
      (account) => !usedAddressSet.has(account.address.toLowerCase())
    )?.address;

    if (!availableAccount) {
      throw new Error("No available wallet addresses");
    }

    console.log(`Selected available wallet address: ${availableAccount}`);
    return availableAccount;
  } catch (error) {
    console.error("Error getting available wallet:", error);
    throw error;
  }
};

// Test database connection
const testDatabaseConnection = async () => {
  try {
    await db.authenticate();
    console.log('Database connection established successfully.');
    
    // Count users
    const userCount = await User.count();
    console.log(`Found ${userCount} users in database`);
    
    // List all users
    const users = await User.findAll();
    users.forEach(user => {
      console.log(`User ID: ${user.id}, Email: ${user.email}, Wallet: ${user.walletAddress}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

// Main function
const main = async () => {
  try {
    console.log("Testing database connection...");
    await testDatabaseConnection();
    
    console.log("\nTesting wallet assignment...");
    const wallet = await getAvailableWallet();
    console.log(`Successfully got wallet: ${wallet}`);
    
    // Test user creation with the wallet
    console.log("\nTesting user creation...");
    const testUser = await User.create({
      firebaseId: `test-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      walletAddress: wallet
    });
    
    console.log(`Created test user with ID: ${testUser.id}, Wallet: ${testUser.walletAddress}`);
    
    // Clean up the test user
    await testUser.destroy();
    console.log(`Deleted test user`);
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Close the database connection
    await db.close();
    console.log("Test completed, database connection closed");
  }
};

// Run the main function
main(); 