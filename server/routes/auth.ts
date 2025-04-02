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

    const availableAccount = accounts.find(
      (account) => !usedAddressSet.has(account.address.toLowerCase())
    )?.address;

    if (!availableAccount) {
      throw new Error("No available wallet addresses");
    }

    return availableAccount;
  } catch (error) {
    console.error("Error getting available wallet:", error);
    throw error;
  }
};

// Register route
const registerUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      res.status(400).json({ message: "Email, password, and role are required" });
      return;
    }
    if (!["landlord", "renter", "lender"].includes(role)) {
      res.status(400).json({ message: "Invalid role. Must be landlord, renter, or lender" });
      return;
    }
    const userRecord = await admin.auth().createUser({ email, password });
    const walletAddress = await getAvailableWallet();
    const user = await User.create({ firebaseId: userRecord.uid, email, role, walletAddress });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, email: user.email, role: user.role, walletAddress: user.walletAddress },
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
      role: user.role,
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
        role: user.role,
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
