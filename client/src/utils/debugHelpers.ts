import { ethers } from "ethers";

/**
 * Debug utility to check a rental contract's state
 * @param rentalContractAddress The address of the rental contract
 * @param signer An ethers.js signer
 */
export async function debugRentalContract(
  rentalContractAddress: string,
  signer: ethers.Signer
): Promise<void> {
  try {
    console.log("🔍 DEBUG: Inspecting rental contract at", rentalContractAddress);
    
    const rentalContractABI = [
      "function getContractStatus() external view returns (uint8)",
      "function getContractDetails() external view returns (address, address, uint256, uint256, uint256, uint256, uint8, uint256, uint256, uint256, uint256, uint256)",
      "function lastPaidMonth() external view returns (uint256)",
      "function currentMonth() external view returns (uint256)",
      "function rentPaidForMonth(uint256) external view returns (bool)"
    ];
    
    const rentalContract = new ethers.Contract(
      rentalContractAddress,
      rentalContractABI,
      signer
    );
    
    // Get basic status
    const status = await rentalContract.getContractStatus();
    console.log("Contract status:", status);
    
    // Get detailed information
    const details = await rentalContract.getContractDetails();
    console.log("Contract details:", {
      landlord: details[0],
      renter: details[1],
      rentalDuration: Number(details[2]),
      securityDeposit: ethers.formatEther(details[3]),
      baseRent: ethers.formatEther(details[4]),
      gracePeriod: Number(details[5]),
      status: Number(details[6]),
      currentSecurityDeposit: ethers.formatEther(details[7]),
      lastPaidMonth: Number(details[8]),
      dueAmount: ethers.formatEther(details[9]),
      skippedMonths: Number(details[10]),
      currentMonth: Number(details[11]),
    });
    
    // Check specific payment status
    const lastPaidMonth = await rentalContract.lastPaidMonth();
    const currentMonth = await rentalContract.currentMonth();
    console.log("Last paid month:", Number(lastPaidMonth));
    console.log("Current month:", Number(currentMonth));
    
    // Check payment status for current and next month
    const currentMonthPaid = await rentalContract.rentPaidForMonth(Number(currentMonth));
    const nextMonthPaid = await rentalContract.rentPaidForMonth(Number(currentMonth) + 1);
    
    console.log(`Month ${Number(currentMonth)} paid:`, currentMonthPaid);
    console.log(`Month ${Number(currentMonth) + 1} paid:`, nextMonthPaid);
    
  } catch (error) {
    console.error("Error debugging rental contract:", error);
  }
}

/**
 * Debug utility to check a loan agreement's state
 * @param loanContractAddress The address of the loan contract
 * @param signer An ethers.js signer
 */
export async function debugLoanContract(
  loanContractAddress: string,
  signer: ethers.Signer
): Promise<void> {
  try {
    console.log("🔍 DEBUG: Inspecting loan contract at", loanContractAddress);
    
    const loanContractABI = [
      "function getStatus() external view returns (uint8)",
      "function loanAmount() external view returns (uint256)",
      "function rentalContract() external view returns (address)",
      "function borrower() external view returns (address)",
      "function lender() external view returns (address)"
    ];
    
    const loanContract = new ethers.Contract(
      loanContractAddress,
      loanContractABI,
      signer
    );
    
    // Get basic information
    const status = await loanContract.getStatus();
    const loanAmount = await loanContract.loanAmount();
    const rentalContractAddress = await loanContract.rentalContract();
    const borrower = await loanContract.borrower();
    const lender = await loanContract.lender();
    
    console.log("Loan contract info:", {
      status: Number(status),
      loanAmount: ethers.formatEther(loanAmount),
      rentalContractAddress,
      borrower,
      lender
    });
    
    // Also check the rental contract
    await debugRentalContract(rentalContractAddress, signer);
    
  } catch (error) {
    console.error("Error debugging loan contract:", error);
  }
}

/**
 * Function to be added to the browser console for easy debugging
 */
export function setupDebugHelpers(signer: ethers.Signer): void {
  // @ts-ignore - Add to window object for console access
  window.debugHelpers = {
    checkRental: async (address: string) => await debugRentalContract(address, signer),
    checkLoan: async (address: string) => await debugLoanContract(address, signer)
  };
  
  console.log("Debug helpers attached to window.debugHelpers");
  console.log("Usage: window.debugHelpers.checkLoan('0x...')");
  console.log("       window.debugHelpers.checkRental('0x...')");
} 