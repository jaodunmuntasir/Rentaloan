import { ethers } from "ethers";

declare global {
  interface Window {
    debugHelpers?: {
      checkRental: (address: string) => Promise<void>;
      checkLoan: (address: string) => Promise<void>;
    };
  }
} 