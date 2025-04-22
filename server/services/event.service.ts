import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { RentalAgreement, RentalAgreementStatus } from '../models/rental-agreement.model';
import { LoanAgreement, LoanAgreementStatus } from '../models/loan-agreement.model';
import { Payment, PaymentType } from '../models/payment.model';
import { User } from '../models/user.model';

// Load contract addresses
const contractAddressesPath = path.join(__dirname, '../../config/contractAddresses.json');
let contractAddresses: { rentalAgreementFactory: string, loanAgreementFactory: string };

try {
  const addressesRaw = fs.readFileSync(contractAddressesPath, 'utf8');
  contractAddresses = JSON.parse(addressesRaw);
} catch (error) {
  console.error('Failed to load contract addresses:', error);
  contractAddresses = {
    rentalAgreementFactory: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    loanAgreementFactory: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512'
  };
}

// Load contract ABIs
const loadArtifact = (contractName: string) => {
  try {
    const artifactPath = path.join(__dirname, `../../contracts/ABI/${contractName}.json`);
    const artifactRaw = fs.readFileSync(artifactPath, 'utf8');
    const parsedArtifact = JSON.parse(artifactRaw);
    
    // Return just the ABI part for ethers.js v6 compatibility
    return { 
      abi: parsedArtifact.abi || parsedArtifact 
    };
  } catch (error) {
    console.error(`Error loading artifact for ${contractName}:`, error);
    throw error;
  }
};

// Provider and contract instances
let provider: ethers.JsonRpcProvider;
let rentalFactoryContract: ethers.Contract;
let loanFactoryContract: ethers.Contract;

// Initialize provider and contracts
const initEventService = async () => {
  try {
    provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    const RentalAgreementFactoryArtifact = loadArtifact('RentalAgreementFactory');
    const LoanAgreementFactoryArtifact = loadArtifact('LoanAgreementFactory');
    
    rentalFactoryContract = new ethers.Contract(
      contractAddresses.rentalAgreementFactory,
      RentalAgreementFactoryArtifact.abi,
      provider
    );
    
    loanFactoryContract = new ethers.Contract(
      contractAddresses.loanAgreementFactory,
      LoanAgreementFactoryArtifact.abi,
      provider
    );
    
    // Start listening to events
    setupEventListeners();
    
    console.log('Event service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize event service:', error);
    throw error;
  }
};

// Set up event listeners for all relevant events
const setupEventListeners = () => {
  // RentalAgreementFactory Events
  listenToRentalFactoryEvents();
  
  // LoanAgreementFactory Events
  listenToLoanFactoryEvents();
  
  // Listen to events from all existing RentalAgreements
  listenToExistingRentalAgreements();
  
  // Listen to events from all existing LoanAgreements
  listenToExistingLoanAgreements();
};

// Listen to RentalAgreementFactory events
const listenToRentalFactoryEvents = () => {
  // AgreementCreated event
  rentalFactoryContract.on('AgreementCreated', async (contractAddress, landlord, renter, name, event) => {
    console.log(`New rental agreement created: ${contractAddress}`);
    
    try {
      // Check if the agreement already exists in the database
      const existingAgreement = await RentalAgreement.findOne({
        where: { contractAddress }
      });
      
      if (!existingAgreement) {
        // Find the user IDs for landlord and renter
        const landlordUser = await User.findOne({
          where: { walletAddress: landlord.toLowerCase() }
        });
        
        const renterUser = await User.findOne({
          where: { walletAddress: renter.toLowerCase() }
        });
        
        if (!landlordUser || !renterUser) {
          console.error(`Landlord or renter user not found for agreement ${contractAddress}`);
          return;
        }
        
        // Create a new rental agreement in the database
        await RentalAgreement.create({
          contractAddress,
          landlordId: landlordUser.id,
          renterId: renterUser.id,
          name,
          status: RentalAgreementStatus.INITIALIZED,
          startDate: null,
          createdDate: new Date(),
          txHash: event.transactionHash
        });
        
        console.log(`Rental agreement ${contractAddress} added to database`);
      }
      
      // Set up listeners for the new rental agreement
      listenToRentalAgreementEvents(contractAddress);
    } catch (error) {
      console.error(`Error processing AgreementCreated event for ${contractAddress}:`, error);
    }
  });
};

// Listen to LoanAgreementFactory events
const listenToLoanFactoryEvents = () => {
  // LoanAgreementCreated event
  loanFactoryContract.on('LoanAgreementCreated', async (contractAddress, lender, borrower, rentalContract, event) => {
    console.log(`New loan agreement created: ${contractAddress}`);
    
    try {
      // Check if the loan agreement already exists in the database
      const existingLoan = await LoanAgreement.findOne({
        where: { contractAddress }
      });
      
      if (!existingLoan) {
        // Find the user IDs for lender and borrower
        const lenderUser = await User.findOne({
          where: { walletAddress: lender.toLowerCase() }
        });
        
        const borrowerUser = await User.findOne({
          where: { walletAddress: borrower.toLowerCase() }
        });
        
        // Find the rental agreement
        const rental = await RentalAgreement.findOne({
          where: { contractAddress: rentalContract }
        });
        
        if (!lenderUser || !borrowerUser || !rental) {
          console.error(`Lender, borrower, or rental agreement not found for loan ${contractAddress}`);
          return;
        }
        
        // Create a new loan agreement in the database
        await LoanAgreement.create({
          contractAddress,
          lenderId: lenderUser.id,
          borrowerId: borrowerUser.id,
          status: LoanAgreementStatus.INITIALIZED,
          startDate: null,
          createdDate: new Date(),
          txHash: event.transactionHash
        });
        
        console.log(`Loan agreement ${contractAddress} added to database`);
      }
      
      // Set up listeners for the new loan agreement
      listenToLoanAgreementEvents(contractAddress);
    } catch (error) {
      console.error(`Error processing LoanAgreementCreated event for ${contractAddress}:`, error);
    }
  });
};

// Listen to events from existing RentalAgreements
const listenToExistingRentalAgreements = async () => {
  try {
    // Get all rental agreements from the database
    const agreements = await RentalAgreement.findAll();
    
    for (const agreement of agreements) {
      listenToRentalAgreementEvents(agreement.contractAddress);
    }
    
    console.log(`Set up listeners for ${agreements.length} existing rental agreements`);
  } catch (error) {
    console.error('Error setting up listeners for existing rental agreements:', error);
  }
};

// Listen to events from existing LoanAgreements
const listenToExistingLoanAgreements = async () => {
  try {
    // Get all loan agreements from the database
    const loans = await LoanAgreement.findAll();
    
    for (const loan of loans) {
      listenToLoanAgreementEvents(loan.contractAddress);
    }
    
    console.log(`Set up listeners for ${loans.length} existing loan agreements`);
  } catch (error) {
    console.error('Error setting up listeners for existing loan agreements:', error);
  }
};

// Listen to events from a specific RentalAgreement
const listenToRentalAgreementEvents = async (contractAddress: string) => {
  try {
    const RentalAgreementArtifact = loadArtifact('RentalAgreement');
    const rentalContract = new ethers.Contract(
      contractAddress,
      RentalAgreementArtifact.abi,
      provider
    );
    
    // SecurityDepositPaid event
    rentalContract.on('SecurityDepositPaid', async (renter, amount, event) => {
      console.log(`Security deposit paid for rental agreement ${contractAddress}`);
      
      try {
        // Update the rental agreement status
        const agreement = await RentalAgreement.findOne({
          where: { contractAddress }
        });
        
        if (agreement) {
          // Find the user who paid
          const renterUser = await User.findOne({
            where: { walletAddress: renter.toLowerCase() }
          });
          
          // Find the landlord
          const landlordUser = await User.findByPk(agreement.landlordId);
          
          if (!renterUser || !landlordUser) {
            console.error(`Renter or landlord not found for agreement ${contractAddress}`);
            return;
          }
          
          // Update agreement status if not already active
          if (agreement.status === RentalAgreementStatus.INITIALIZED) {
            await agreement.update({
              status: RentalAgreementStatus.ACTIVE,
              startDate: new Date()
            });
          }
          
          // Record the payment
          await Payment.create({
            rentalAgreementId: agreement.id,
            payerId: renterUser.id,
            recipientId: landlordUser.id,
            amount: parseFloat(ethers.formatEther(amount)),
            txHash: event.transactionHash,
            type: PaymentType.SECURITY_DEPOSIT,
            month: null,
            paymentDate: new Date()
          });
          
          console.log(`Security deposit payment recorded for rental agreement ${contractAddress}`);
        }
      } catch (error) {
        console.error(`Error processing SecurityDepositPaid event for ${contractAddress}:`, error);
      }
    });
    
    // RentPaid event
    rentalContract.on('RentPaid', async (renter, month, amount, paymentMethod, event) => {
      console.log(`Rent paid for month ${month} in rental agreement ${contractAddress}`);
      
      try {
        const agreement = await RentalAgreement.findOne({
          where: { contractAddress }
        });
        
        if (agreement) {
          // Find the user who paid
          const renterUser = await User.findOne({
            where: { walletAddress: renter.toLowerCase() }
          });
          
          // Find the landlord
          const landlordUser = await User.findByPk(agreement.landlordId);
          
          if (!renterUser || !landlordUser) {
            console.error(`Renter or landlord not found for agreement ${contractAddress}`);
            return;
          }
          
          // Record the payment
          await Payment.create({
            rentalAgreementId: agreement.id,
            payerId: renterUser.id,
            recipientId: landlordUser.id,
            amount: parseFloat(ethers.formatEther(amount)),
            txHash: event.transactionHash,
            type: PaymentType.RENT,
            month: month,
            paymentDate: new Date()
          });
          
          console.log(`Rent payment recorded for month ${month} in rental agreement ${contractAddress}`);
        }
      } catch (error) {
        console.error(`Error processing RentPaid event for ${contractAddress}:`, error);
      }
    });
    
    // RentSkipped event
    rentalContract.on('RentSkipped', async (renter, month, event) => {
      console.log(`Rent skipped for month ${month} in rental agreement ${contractAddress}`);
      
      try {
        const agreement = await RentalAgreement.findOne({
          where: { contractAddress }
        });
        
        if (agreement) {
          // Find the renter
          const renterUser = await User.findOne({
            where: { walletAddress: renter.toLowerCase() }
          });
          
          if (!renterUser) {
            console.error(`Renter not found for agreement ${contractAddress}`);
            return;
          }
          
          // Record the skipped payment (with zero amount)
          await Payment.create({
            rentalAgreementId: agreement.id,
            payerId: renterUser.id,
            recipientId: agreement.landlordId,
            amount: 0,
            txHash: event.transactionHash,
            type: PaymentType.RENT,
            month: month,
            paymentDate: new Date()
          });
          
          console.log(`Rent skip recorded for month ${month} in rental agreement ${contractAddress}`);
        }
      } catch (error) {
        console.error(`Error processing RentSkipped event for ${contractAddress}:`, error);
      }
    });
    
    // ContractExtended event
    rentalContract.on('ContractExtended', async (landlord, additionalMonths, event) => {
      console.log(`Rental agreement ${contractAddress} extended by ${additionalMonths} months`);
      
      try {
        // Update the rental agreement
        const agreement = await RentalAgreement.findOne({
          where: { contractAddress }
        });
        
        if (agreement) {
          // No need to update anything in the database, as the contract details
          // will be fetched from the blockchain when needed
          console.log(`Rental agreement ${contractAddress} extension recorded`);
        }
      } catch (error) {
        console.error(`Error processing ContractExtended event for ${contractAddress}:`, error);
      }
    });
    
    // ContractClosed event
    rentalContract.on('ContractClosed', async (closer, reason, event) => {
      console.log(`Rental agreement ${contractAddress} closed`);
      
      try {
        // Update the rental agreement status
        const agreement = await RentalAgreement.findOne({
          where: { contractAddress }
        });
        
        if (agreement) {
          await agreement.update({
            status: RentalAgreementStatus.CLOSED
          });
          
          console.log(`Rental agreement ${contractAddress} marked as closed`);
        }
      } catch (error) {
        console.error(`Error processing ContractClosed event for ${contractAddress}:`, error);
      }
    });
    
    console.log(`Set up listeners for rental agreement ${contractAddress}`);
  } catch (error) {
    console.error(`Error setting up listeners for rental agreement ${contractAddress}:`, error);
  }
};

// Listen to events from a specific LoanAgreement
const listenToLoanAgreementEvents = async (contractAddress: string) => {
  try {
    const LoanAgreementArtifact = loadArtifact('LoanAgreement');
    const loanContract = new ethers.Contract(
      contractAddress,
      LoanAgreementArtifact.abi,
      provider
    );
    
    // LoanInitialized event
    loanContract.on('LoanInitialized', async (lender, amount, event) => {
      console.log(`Loan initialized for agreement ${contractAddress}`);
      
      try {
        // Update the loan agreement status
        const loan = await LoanAgreement.findOne({
          where: { contractAddress }
        });
        
        if (loan) {
          // Find the lender
          const lenderUser = await User.findOne({
            where: { walletAddress: lender.toLowerCase() }
          });
          
          if (!lenderUser) {
            console.error(`Lender not found for loan ${contractAddress}`);
            return;
          }
          
          // Update loan status if not already active
          if (loan.status === LoanAgreementStatus.INITIALIZED) {
            await loan.update({
              status: LoanAgreementStatus.ACTIVE,
              startDate: new Date()
            });
          }
          
          // Record the payment
          await Payment.create({
            loanAgreementId: loan.id,
            payerId: lenderUser.id,
            recipientId: loan.borrowerId,
            amount: parseFloat(ethers.formatEther(amount)),
            txHash: event.transactionHash,
            type: PaymentType.LOAN_INITIALIZATION,
            month: null,
            paymentDate: new Date()
          });
          
          console.log(`Loan initialization recorded for loan agreement ${contractAddress}`);
        }
      } catch (error) {
        console.error(`Error processing LoanInitialized event for ${contractAddress}:`, error);
      }
    });
    
    // RepaymentMade event
    loanContract.on('RepaymentMade', async (borrower, month, amount, event) => {
      console.log(`Repayment made for month ${month} in loan agreement ${contractAddress}`);
      
      try {
        const loan = await LoanAgreement.findOne({
          where: { contractAddress }
        });
        
        if (loan) {
          // Find the borrower
          const borrowerUser = await User.findOne({
            where: { walletAddress: borrower.toLowerCase() }
          });
          
          if (!borrowerUser) {
            console.error(`Borrower not found for loan ${contractAddress}`);
            return;
          }
          
          // Record the payment
          await Payment.create({
            loanAgreementId: loan.id,
            payerId: borrowerUser.id,
            recipientId: loan.lenderId,
            amount: parseFloat(ethers.formatEther(amount)),
            txHash: event.transactionHash,
            type: PaymentType.LOAN_REPAYMENT,
            month: month,
            paymentDate: new Date()
          });
          
          console.log(`Loan repayment recorded for month ${month} in loan agreement ${contractAddress}`);
          
          // Check if this was the final payment and update loan status if needed
          try {
            // @ts-ignore - Contract method exists at runtime
            const status = await loanContract.getStatus();
            if (Number(status) === 1) { // 1 = CLOSED in the contract
              await loan.update({
                status: LoanAgreementStatus.COMPLETED
              });
              console.log(`Loan agreement ${contractAddress} marked as closed`);
            }
          } catch (contractError) {
            console.error(`Error checking contract status: ${contractError}`);
            // Continue execution even if we can't check the contract status
          }
        }
      } catch (error) {
        console.error(`Error processing RepaymentMade event for ${contractAddress}:`, error);
      }
    });
    
    // LoanDefaulted event
    loanContract.on('LoanDefaulted', async (event) => {
      console.log(`Loan defaulted for agreement ${contractAddress}`);
      
      try {
        // Update the loan agreement status
        const loan = await LoanAgreement.findOne({
          where: { contractAddress }
        });
        
        if (loan) {
          await loan.update({
            status: LoanAgreementStatus.COMPLETED
          });
          
          console.log(`Loan agreement ${contractAddress} marked as closed`);
        }
      } catch (error) {
        console.error(`Error processing LoanDefaulted event for ${contractAddress}:`, error);
      }
    });
    
    console.log(`Set up listeners for loan agreement ${contractAddress}`);
  } catch (error) {
    console.error(`Error setting up listeners for loan agreement ${contractAddress}:`, error);
  }
};

// Initialize the event service
initEventService();

export default {
  initEventService
}; 