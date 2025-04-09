import { ethers } from "ethers";
import * as readline from "readline";
import RentalAgreementABI from "../contracts/ABI/RentalAgreement.json";

// Creates a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Status enum mapping to make the output more readable
const ContractStatusMapping: Record<number, string> = {
  0: "INITIALIZED",    // Initial state, security deposit not paid
  1: "ACTIVE",         // Security deposit paid, contract active
  2: "COMPLETED",      // Contract completed normally
  3: "TERMINATED"      // Contract terminated early
};

// Payment method enum mapping
const PaymentMethodMapping: Record<number, string> = {
  0: "DIRECT",         // Direct payment
  1: "LOAN"            // Payment via loan contract
};

async function main() {
  console.log("\n===== Rental Agreement Contract Query Tool =====\n");
  console.log("This tool allows you to query rental agreement contract details directly from the blockchain.");
  
  try {
    // Connect to Hardhat node
    console.log("Connecting to local Hardhat node...");
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Get the default signer from the local node (for displaying connected account only)
    const signer = await provider.getSigner();
    console.log(`Connected with account: ${await signer.getAddress()}`);
    
    // Ask for the rental contract address
    rl.question("\nEnter the rental agreement contract address: ", async (contractAddress) => {
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
        
        // Create the contract instance with provider (read-only) to avoid address issues
        const rentalContract = new ethers.Contract(contractAddress, RentalAgreementABI, provider);
        
        console.log("\n===== Rental Agreement Details =====\n");
        
        try {
          // Use getContractDetails to get most information in one call
          const details = await rentalContract.getContractDetails();
          // const moreDetails = await rentalContract.getMoreContractDetails();
          // Based on ABI, details contains:
          // [landlord, renter, duration, securityDeposit, baseRent, lastPaid, status, gracePeriod, startTime, skippedMonths]
          
          const [
            contractStatus,
            currentSecurityDeposit,
            dueAmount,
            loanFactoryAddress
          ] = await Promise.all([
            rentalContract.getContractStatus(),
            rentalContract.getCurrentSecurityDeposit(),
            rentalContract.dueAmount(),
            rentalContract.loanAgreementFactory()
          ]);
          
          // Display basic information
          console.log("Contract Address:      ", contractAddress);
          console.log("Status:                ", ContractStatusMapping[Number(contractStatus)] || `Unknown (${contractStatus})`);
          
          console.log("\n--- Parties ---");
          console.log("Landlord:              ", details[0]); // landlord address
          console.log("Renter:                ", details[1]); // renter address
          console.log("Loan Factory:          ", loanFactoryAddress);
          
          console.log("\n--- Rental Terms ---");
          console.log("Duration:              ", Number(details[2]), "months"); // duration
          console.log("Base Rent:             ", ethers.formatEther(details[4]), "ETH"); // baseRent
          console.log("Security Deposit:      ", ethers.formatEther(details[3]), "ETH"); // securityDeposit
          console.log("Current Deposit:       ", ethers.formatEther(currentSecurityDeposit), "ETH");
          console.log("Grace Period:          ", Number(details[5]), "months"); // gracePeriod
          
          console.log("\n--- Payment Status ---");
          console.log("Last Paid Month:       ", Number(details[8])); // lastPaid
          console.log("Due Amount:            ", ethers.formatEther(details[9]), "ETH");
          console.log("Current Month:         ", Number(details[11]));
          console.log("Skipped Months:        ", Number(details[10])); // skippedMonths

          
          // Get payment history
          console.log("\n--- Payment History ---");
          const duration = Number(details[2]);
          
          if (duration > 0) {
            console.log("Month | Paid | Skipped");
            console.log("---------------------");
            
            const paymentQueries = [];
            const skipQueries = [];
            
            // Create queries for all months
            for (let month = 1; month <= duration; month++) {
              paymentQueries.push(rentalContract.rentPaidForMonth(month));
              skipQueries.push(rentalContract.rentSkippedForMonth(month));
            }
            
            // Execute all queries
            const [paymentResults, skipResults] = await Promise.all([
              Promise.all(paymentQueries),
              Promise.all(skipQueries)
            ]);
            
            // Display payment history
            for (let month = 1; month <= duration; month++) {
              console.log(`${month}     | ${paymentResults[month-1] ? 'Yes' : 'No'} | ${skipResults[month-1] ? 'Yes' : 'No'}`);
            }
          } else {
            console.log("No payment history available (duration is 0)");
          }
          
          console.log("\n===== End of Contract Details =====\n");
          
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Error fetching contract details:", errorMessage);
        }
        
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