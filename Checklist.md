# Development Checklist for Blockchain-Based Rental Loan System

## 1. Smart Contract Development and Deployment
- [x] Setup Hardhat environment (external)
- [x] Deploy smart contracts to local Hardhat network (manually completed)
  - [x] Factory contracts deployed at:
    - RentalAgreementFactory: 0x5fbdb2315678afecb367f032d93f642f64180aa3
    - LoanAgreementFactory: 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512
  - [x] Execute `npm run deploy:contracts` to verify and save contract addresses
  - [x] Verify contract addresses are saved in config/contractAddresses.json

## 2. Backend Development
- [x] Basic Express server setup (already in place)
- [x] Firebase authentication setup (already in place)
- [x] Database Models Implementation
  - [x] User model (already implemented)
  - [x] RentalAgreement model
    - [x] Define schema with contractAddress, landlordId, renterId, name, status, etc.
  - [x] LoanRequest model
    - [x] Define schema with rentalAgreementId, requesterId, amount, duration, status
  - [x] LoanOffer model
    - [x] Define schema with loanRequestId, lenderId, interestRate, duration, graceMonths, status
  - [x] LoanAgreement model
    - [x] Define schema with contractAddress, borrowerId, lenderId, amount, etc.
  - [x] Payment model
    - [x] Define schema for tracking all payment transactions

## API Endpoints Implementation

### Rental Routes
- [x] POST /api/rental/create
- [x] GET /api/rental
- [x] GET /api/rental/:address
- [x] POST /api/rental/:address/pay-deposit
- [x] POST /api/rental/:address/pay-rent
- [x] POST /api/rental/:address/skip-rent
- [x] POST /api/rental/:address/extend

### Loan Routes
- [x] POST /api/loan/request
- [x] GET /api/loan/requests
- [x] GET /api/loan/requests/:id
- [x] POST /api/loan/offer
- [x] GET /api/loan/offers
- [x] POST /api/loan/offer/:id/accept
- [x] POST /api/loan/offer/:id/withdraw
- [x] GET /api/loan/:address
- [x] POST /api/loan/:address/initialize
- [x] POST /api/loan/:address/repay

### User Routes
- [x] GET /api/user/profile
- [x] PUT /api/user/profile
- [x] GET /api/user/dashboard
- [x] GET /api/user/payments

- [x] Blockchain Interaction Services
  - [x] Create utilities for interacting with smart contracts
  - [x] Implement transaction signing and sending
  - [x] Error handling and receipt processing

- [x] Event Services
  - [x] Set up listeners for contract events
  - [x] Process events and update database records
  - [x] Handle error scenarios

## 3. Frontend Development
- [x] UI components setup with shadcn/ui (already in place)
- [x] Firebase authentication config (already in place)

- [ ] Application Structure
  - [ ] Setup React Router 
    - [ ] Define routes for all pages
    - [ ] Implement protected routes
  
- [ ] Context Providers
  - [ ] Authentication context
  - [ ] Wallet context (for ethers.js connections)
  - [ ] Blockchain contract context

- [ ] Custom Hooks
  - [ ] useAuth hook
  - [ ] useWallet hook (for connecting to Hardhat network)
  - [ ] useContract hooks (for different contracts)
  - [ ] useRentalAgreement hook
  - [ ] useLoanAgreement hook

- [ ] Page Components
  - [ ] Authentication
    - [ ] Login page
    - [ ] Registration page
    - [ ] User profile page
  
  - [ ] Dashboard
    - [ ] Landlord dashboard
    - [ ] Renter dashboard
    - [ ] Lender dashboard
  
  - [ ] Rental Features
    - [ ] Create rental agreement page
    - [ ] Rental agreement details page
    - [ ] Pay security deposit component
    - [ ] Pay rent component
    - [ ] Skip rent component
    - [ ] Extend agreement component
  
  - [ ] Loan Features
    - [ ] Create loan request page
    - [ ] Browse loan requests page
    - [ ] Create loan offer component
    - [ ] View loan offers page
    - [ ] Loan agreement details page
    - [ ] Pay loan repayment component

- [ ] API Services
  - [ ] Auth service
  - [ ] Rental service
  - [ ] Loan service

## 4. Integration and Testing
- [ ] Integration Testing
  - [ ] Test contract deployment
  - [ ] Test user registration and authentication
  - [ ] Test rental agreement creation flow
  - [ ] Test security deposit payment
  - [ ] Test rent payment flow
  - [ ] Test loan request and offer flow
  - [ ] Test loan initialization
  - [ ] Test loan repayment flow

- [ ] E2E Testing
  - [ ] Test landlord workflow
  - [ ] Test renter workflow
  - [ ] Test lender workflow

## 5. Developer Environment Setup
- [ ] Create comprehensive .env.example file
- [ ] Document setup process for new developers
- [ ] Create scripts for easy setup and testing

## 6. Finalize Minimal MVP
- [ ] Remove any unnecessary features
- [ ] Optimize contract interactions
- [ ] Implement proper error handling
- [ ] Add minimal but sufficient UI feedback
- [ ] Ensure all core workflows function correctly

## 7. Optimizations
- [ ] Minimize contract calls with proper batching
- [ ] Implement caching strategy for contract data
- [ ] Optimize database queries
- [ ] Add transaction status tracking
- [ ] Implement proper loading states

## 8. Developer Documentation
- [ ] Document architecture
- [ ] Document API endpoints
- [ ] Document smart contract functions
- [ ] Create workflow diagrams for main processes

# Using the Project with External Hardhat Node

This project has been updated to work with an externally running Hardhat node and manually deployed contracts.

## Prerequisites

1. Have Hardhat installed globally or in another project
2. Have contracts already deployed on a Hardhat node at the following addresses:
   - RentalAgreementFactory: 0x5fbdb2315678afecb367f032d93f642f64180aa3
   - LoanAgreementFactory: 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512

## Steps to Run the Project

1. **Start Hardhat Node Externally**
   Run the following command in a separate terminal with Hardhat installed:
   ```
   npx hardhat node
   ```
   This will start a local Hardhat blockchain at http://127.0.0.1:8545/

2. **Check Connection and Save Contract Addresses**
   With the Hardhat node running:
   ```
   npm run deploy:contracts
   ```
   This will check the connection to the Hardhat node and save the contract addresses to `config/contractAddresses.json`.

3. **Start the Application**
   Start both frontend and backend:
   ```
   npm run dev
   ```

## Notes for Development

- The deployment script only checks that the Hardhat node is running and saves the contract addresses
- No verification of contract artifacts is performed, so contracts can be deployed from any source (e.g., Remix)
- All blockchain transactions will be executed on the external Hardhat node

This checklist provides a structured approach to implement the blockchain-based rental loan system focusing on a minimal but fully functional implementation for local Hardhat development. The plan prioritizes core functionality while ensuring proper integration between smart contracts, backend services, and frontend components.
