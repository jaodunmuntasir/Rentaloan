import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Contract addresses that were manually deployed
const RENTAL_FACTORY_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const LOAN_FACTORY_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

async function main() {
  console.log("Connecting to Hardhat node...");
  
  // Connect to the local Hardhat node
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  try {
    // Check if we can connect to the Hardhat node
    const blockNumber = await provider.getBlockNumber();
    console.log(`Successfully connected to Hardhat node at block #${blockNumber}`);

    // Check if contracts exist (just basic code check, no ABI needed)
    const rentalFactoryCode = await provider.getCode(RENTAL_FACTORY_ADDRESS);
    if (rentalFactoryCode === "0x") {
      console.warn("Warning: No code found at RentalAgreementFactory address. Contract might not be deployed.");
    } else {
      console.log("RentalAgreementFactory found at:", RENTAL_FACTORY_ADDRESS);
    }

    const loanFactoryCode = await provider.getCode(LOAN_FACTORY_ADDRESS);
    if (loanFactoryCode === "0x") {
      console.warn("Warning: No code found at LoanAgreementFactory address. Contract might not be deployed.");
    } else {
      console.log("LoanAgreementFactory found at:", LOAN_FACTORY_ADDRESS);
    }

    // Save contract addresses to a file
    const addresses = {
      rentalAgreementFactory: RENTAL_FACTORY_ADDRESS,
      loanAgreementFactory: LOAN_FACTORY_ADDRESS,
    };

    // Create config directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, "../config"))) {
      fs.mkdirSync(path.join(__dirname, "../config"));
    }

    fs.writeFileSync(
      path.join(__dirname, "../config/contractAddresses.json"),
      JSON.stringify(addresses, null, 2)
    );
    console.log("Contract addresses saved to config/contractAddresses.json");
    
  } catch (error) {
    console.error("Failed to connect to Hardhat node:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
