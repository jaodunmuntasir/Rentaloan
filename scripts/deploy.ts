import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Get the contract factories
  const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
  const LoanAgreementFactory = await ethers.getContractFactory("LoanAgreementFactory");

  // Deploy the contracts
  console.log("Deploying RentalAgreementFactory...");
  const rentalFactory = await RentalAgreementFactory.deploy();
  await rentalFactory.deployed();
  console.log("RentalAgreementFactory deployed to:", rentalFactory.address);

  console.log("Deploying LoanAgreementFactory...");
  const loanFactory = await LoanAgreementFactory.deploy();
  await loanFactory.deployed();
  console.log("LoanAgreementFactory deployed to:", loanFactory.address);

  // Save contract addresses to a file
  const addresses = {
    rentalAgreementFactory: rentalFactory.address,
    loanAgreementFactory: loanFactory.address
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });