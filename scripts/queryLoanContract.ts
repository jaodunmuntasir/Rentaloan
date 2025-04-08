import { ethers } from "ethers";
import * as readline from "readline";
import LoanAgreementABI from "../client/src/contracts/ABI/LoanAgreement.json";

// Creates a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Status enum mapping to make the output more readable
const StatusMapping: Record<number, string> = {
  0: "INITIALIZED",
  1: "READY",
  2: "ACTIVE",
  3: "PAID",
  4: "COMPLETED",
  5: "DEFAULTED"
};

async function main() {
  console.log("\n===== Loan Agreement Contract Query Tool =====\n");
  console.log("This tool allows you to query loan agreement contract details directly from the blockchain.");
  
  try {
    // Connect to Hardhat node
    console.log("Connecting to local Hardhat node...");
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Get the default signer from the local node (for displaying connected account only)
    const signer = await provider.getSigner();
    console.log(`Connected with account: ${await signer.getAddress()}`);
    
    // Ask for the loan contract address
    rl.question("\nEnter the loan agreement contract address: ", async (contractAddress) => {
      try {
        // Validate the address
        if (!ethers.isAddress(contractAddress)) {
          console.error("Error: Invalid Ethereum address format");
          rl.close();
          return;
        }
        
        // Check if contract exists at the address
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
          console.error("Error: No contract found at the provided address");
          rl.close();
          return;
        }
        
        // Create the contract instance with provider (read-only) instead of signer
        // This prevents the borrower address from showing as the caller
        const loanContract = new ethers.Contract(contractAddress, LoanAgreementABI, provider);
        
        console.log("\n===== Loan Agreement Details =====\n");
        
        // Query basic contract information
        const [
          borrower,
          lender,
          rentalContractAddr,
          loanAmount,
          interestRate,
          duration,
          graceMonths,
          monthlyPmt,
          lastPaidMth,
          collateralAmt,
          status
        ] = await Promise.all([
          loanContract.borrower(),
          loanContract.lender(),
          loanContract.rentalContract(),
          loanContract.loanAmount(),
          loanContract.interestRate(),
          loanContract.duration(),
          loanContract.graceMonths(),
          loanContract.monthlyPayment(),
          loanContract.lastPaidMonth(),
          loanContract.collateralAmount(),
          loanContract.getStatus()
        ]);
        
        // Display basic information
        console.log("Contract Address:      ", contractAddress);
        console.log("Status:                ", StatusMapping[Number(status)] || `Unknown (${status})`);
        console.log("\n--- Parties ---");
        console.log("Borrower:              ", borrower);
        console.log("Lender:                ", lender);
        console.log("Rental Contract:       ", rentalContractAddr);
        
        console.log("\n--- Loan Terms ---");
        console.log("Loan Amount:           ", ethers.formatEther(loanAmount), "ETH");
        console.log("Interest Rate:         ", Number(interestRate), "%");
        console.log("Duration:              ", Number(duration), "months");
        console.log("Grace Period:          ", Number(graceMonths), "months");
        console.log("Monthly Payment:       ", ethers.formatEther(monthlyPmt), "ETH");
        console.log("Collateral Amount:     ", ethers.formatEther(collateralAmt), "ETH");
        
        console.log("\n--- Repayment Status ---");
        console.log("Last Paid Month:       ", Number(lastPaidMth));
        
        // Get payment status
        try {
          const paymentStatus = await loanContract.getPaymentStatus();
          console.log("\n--- Payment Details ---");
          
          if (paymentStatus[0].length > 0) {
            console.log("Month | Paid");
            console.log("------------");
            
            for (let i = 0; i < paymentStatus[0].length; i++) {
              console.log(`${Number(paymentStatus[0][i])}     | ${paymentStatus[1][i] ? 'Yes' : 'No'}`);
            }
          } else {
            console.log("No payment records found");
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log("Could not fetch payment details:", errorMessage);
        }
        
        // Get repayment schedule
        try {
          const repaymentSchedule = await loanContract.getRepaymentSchedule();
          console.log("\n--- Repayment Schedule ---");
          
          if (repaymentSchedule[0].length > 0) {
            console.log("Month | Amount (ETH)");
            console.log("-------------------");
            
            // repaymentSchedule format is [amounts[], monthNumbers[]] as per contract
            for (let i = 0; i < repaymentSchedule[0].length; i++) {
              // First array is amounts, second array is month numbers
              const amount = ethers.formatEther(repaymentSchedule[0][i]);
              const monthNumber = Number(repaymentSchedule[1][i]);
              console.log(`${monthNumber}     | ${amount}`);
            }
          } else {
            console.log("No repayment schedule found");
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log("Could not fetch repayment schedule:", errorMessage);
        }
        
        console.log("\n===== End of Contract Details =====\n");
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error querying contract:", errorMessage);
      } finally {
        rl.close();
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to connect to Hardhat node:", errorMessage);
    console.log("Make sure your Hardhat node is running with 'npx hardhat node'");
    rl.close();
  }
}

// Handle readline close
rl.on("close", () => {
  process.exit(0);
});

// Execute the main function
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Unhandled error:", errorMessage);
  process.exit(1);
}); 