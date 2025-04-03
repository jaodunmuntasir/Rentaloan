import express, { Request, Response, NextFunction, RequestHandler } from "express";
import admin from "../config/firebase";
import { authenticate } from "../middleware/auth";
import { ethers } from "ethers";
import db from "../models";
import { User } from "../models/user.model";
import { Op } from "sequelize";

const router = express.Router();

// Get a Hardhat wallet from our local node
const getAvailableWallet = async (): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const accounts = await provider.listAccounts();
    const usedAddresses = await User.findAll({ attributes: ["walletAddress"] });
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

    console.log(`Assigning wallet address: ${availableAccount}`);
    return availableAccount;
  } catch (error) {
    console.error("Error getting available wallet:", error);
    throw error;
  }
};

// Register route - handles both token-based and direct registration
const registerUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    // Get user info either from auth token or from request body
    let firebaseId, email, displayName;
    
    if (req.headers.authorization?.startsWith('Bearer ')) {
      // Token-based registration (from frontend)
      const token = req.headers.authorization.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      firebaseId = decodedToken.uid;
      
      // Get user details from Firebase
      const userRecord = await admin.auth().getUser(firebaseId);
      email = userRecord.email;
      displayName = userRecord.displayName;
      
      console.log(`Registering user with Firebase ID: ${firebaseId}, Email: ${email}`);
    } else {
      // Direct registration (e.g., admin creating users)
      const { email: reqEmail, password } = req.body;
      
      if (!reqEmail || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }
      
      email = reqEmail;
      
      // Create user in Firebase
      const userRecord = await admin.auth().createUser({ email, password });
      firebaseId = userRecord.uid;
      
      console.log(`Created new user with Firebase ID: ${firebaseId}, Email: ${email}`);
    }
    
    // Check if user already exists in our database
    const existingUser = await User.findOne({ where: { firebaseId } });
    if (existingUser) {
      res.status(409).json({ message: "User already registered" });
      return;
    }
    
    // Get an available wallet address
    const walletAddress = await getAvailableWallet();
    
    // Create user in our database
    const user = await User.create({ 
      firebaseId, 
      email, 
      walletAddress
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { 
        id: user.id, 
        email: user.email, 
        walletAddress: user.walletAddress 
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed", error: (error as Error).message });
  }
};

router.post("/register", registerUser);

// Get user profile
const getUserProfile: RequestHandler = async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const user = await User.findOne({ where: { firebaseId: req.user.uid } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile", error: (error as Error).message });
  }
};

router.get("/profile", authenticate as RequestHandler, getUserProfile);

// Update user profile
const updateUserProfile: RequestHandler = async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { name, email } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { firebaseId: req.user.uid } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Update user fields
    const updates: any = {};
    if (name) updates.name = name;
    if (email) {
      // Check if email is already in use
      const existingUser = await User.findOne({ where: { email, firebaseId: { [Op.ne]: req.user.uid } } });
      if (existingUser) {
        res.status(400).json({ message: "Email is already in use" });
        return;
      }
      
      // Update email in Firebase
      await admin.auth().updateUser(req.user.uid, { email });
      updates.email = email;
    }

    // Update user in database
    await user.update(updates);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile", error: (error as Error).message });
  }
};

router.put("/profile", authenticate as RequestHandler, updateUserProfile);

export default router;
