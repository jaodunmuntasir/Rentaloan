import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Get the contract factories
  const RentalAgreementFactory = await ethers.getContractFactory(
    "RentalAgreementFactory"
  );
  const LoanAgreementFactory = await ethers.getContractFactory(
    "LoanAgreementFactory"
  );

  // Deploy the contracts
  console.log("Deploying RentalAgreementFactory...");
  const rentalFactory = await RentalAgreementFactory.deploy();
  await rentalFactory.waitForDeployment();
  console.log(
    "RentalAgreementFactory deployed to:",
    await rentalFactory.getAddress()
  );

  console.log("Deploying LoanAgreementFactory...");
  const loanFactory = await LoanAgreementFactory.deploy();
  await loanFactory.waitForDeployment();
  console.log(
    "LoanAgreementFactory deployed to:",
    await loanFactory.getAddress()
  );

  // Save contract addresses to a file
  const addresses = {
    rentalAgreementFactory: await rentalFactory.getAddress(),
    loanAgreementFactory: await loanFactory.getAddress(),
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
