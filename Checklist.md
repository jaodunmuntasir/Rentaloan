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
  - [x] LoanRequest model
  - [x] LoanOffer model
  - [x] LoanAgreement model
  - [x] Payment model

### Blockchain Interaction
- [x] Create utilities for interacting with smart contracts
- [x] Implement transaction signing and sending
- [x] Error handling and receipt processing

### Event Services
- [x] Set up listeners for contract events
- [x] Process events and update database records
- [x] Handle error scenarios

### API Endpoints Implementation
- [ ] Complete API controllers for endpoints

#### Authentication Routes
- [x] POST /api/auth/register - Register a new user
  - Requirements: Email/password validation, role verification
- [ ] POST /api/auth/login - Login user
  - Requirements: Credentials validation, token generation
- [x] GET /api/auth/profile - Get user profile
  - Requirements: Token verification, user data retrieval
- [ ] PUT /api/auth/profile - Update user profile
  - Requirements: Validate updates, persist changes

#### Rental Routes
- [ ] POST /api/rental/create - Create rental agreement
  - Requirements: Renter email, duration, securityDeposit, baseRent, name
- [ ] GET /api/rental - Get user's rental agreements
  - Requirements: Filter by role (landlord/renter)
- [ ] GET /api/rental/:address - Get rental agreement details
  - Requirements: Contract address validation, payment history
- [ ] POST /api/rental/:address/pay-deposit - Pay security deposit
  - Requirements: Exact deposit amount, transaction handling
- [ ] POST /api/rental/:address/pay-rent - Pay rent
  - Requirements: Month, amount (base rent + any due amount)
- [ ] POST /api/rental/:address/skip-rent - Skip rent payment
  - Requirements: Month (must be within grace period)
- [ ] POST /api/rental/:address/extend - Extend rental agreement
  - Requirements: Additional months (only available in last month)

#### Loan Routes
- [ ] POST /api/loan/request - Create loan request
  - Requirements: RentalAddress, amount (≤ available collateral), duration
- [ ] GET /api/loan/requests - Get loan requests based on filters
  - Requirements: Status, amount filters
- [ ] GET /api/loan/requests/:id - Get loan request details
  - Requirements: Request ID validation
- [ ] POST /api/loan/offer - Create loan offer
  - Requirements: RequestId, interestRate (1-100%), duration, graceMonths
- [ ] GET /api/loan/offers - Get user's loan offers
  - Requirements: Filter by role (borrower/lender)
- [ ] POST /api/loan/offer/:id/accept - Accept loan offer
  - Requirements: Offer ID validation, status updates
- [ ] POST /api/loan/offer/:id/withdraw - Withdraw loan offer
  - Requirements: Offer ID validation, status update
- [ ] GET /api/loan/:address - Get loan agreement details
  - Requirements: Contract address validation
- [ ] POST /api/loan/:address/initialize - Initialize loan
  - Requirements: Exact loan amount, transaction handling
- [ ] POST /api/loan/:address/repay - Make loan repayment
  - Requirements: Month, amount (with interest)

#### User Routes
- [ ] GET /api/user/dashboard - Get dashboard data
  - Requirements: Role-specific data aggregation 
- [ ] GET /api/user/payments - Get payment history
  - Requirements: Filter by type, date range

## 3. Frontend Development
- [x] UI components setup with shadcn/ui (already in place)
- [x] Firebase authentication config (already in place)
- [x] Application Structure with React Router (already in place)

### Context Providers
- [x] Authentication context implementation
  - Requirements: Login/logout state management, user role handling
- [x] Wallet context implementation
  - Requirements: Connect to Hardhat, handle address and balance
- [x] Blockchain contract context implementation
  - Requirements: Factory instances, error handling, loading states

### Custom Hooks
- [x] useAuth hook implementation
  - Requirements: Authentication state, login/logout functions
- [x] useWallet hook implementation
  - Requirements: Wallet connection, balance retrieval
- [x] useContract hooks implementation
  - Requirements: Contract instance creation, method access
- [x] useRentalAgreement hook implementation
  - Requirements: Agreement operations, transaction handling
- [x] useLoanAgreement hook implementation
  - Requirements: Loan operations, payment calculations

### Page Components
#### Authentication
- [x] Login page
  - Requirements: Email/password inputs, validation, error handling
- [x] Registration page
  - Requirements: Role selection, email validation, password requirements
- [x] User profile page
  - Requirements: Display user info, role, and wallet address

#### Dashboard
- [x] Main dashboard view
  - Requirements: Role-specific views, summary statistics

#### Rental Features
- [x] Create rental agreement page
  - Requirements: Form with renter email, duration, deposit, rent, name
- [x] Rental agreement details page
  - Requirements: Display status, terms, payment history
- [x] Pay security deposit component
  - Requirements: Display deposit amount, transaction handling
- [x] Pay rent component
  - Requirements: Month selection, amount calculation
- [x] Skip rent component
  - Requirements: Grace period validation, confirmation
- [x] Extend agreement component
  - Requirements: Duration selection, timing validation

#### Loan Features
- [ ] Create loan request page
  - Requirements: Amount input, duration selection, collateral validation
- [ ] Browse loan requests page
  - Requirements: Filterable list, status indicators
- [ ] Create loan offer component
  - Requirements: Interest rate, duration inputs, calculation preview
- [ ] View loan offers page
  - Requirements: Compare offers, accept/reject functionality
- [ ] Loan agreement details page
  - Requirements: Terms display, repayment schedule
- [ ] Pay loan repayment component
  - Requirements: Amount calculation, transaction processing

### API Services
- [x] Auth service implementation
  - Requirements: Register, login, profile management
- [x] Rental service implementation
  - Requirements: All rental-related API endpoints
- [x] Loan service implementation
  - Requirements: Loan request, offer, repayment endpoints

## 4. Testing and Integration
- [ ] Test Basic User Flows
  - [ ] Landlord creating rental agreement
    - Requirements: Form submission, contract creation, database entry
  - [ ] Renter paying security deposit
    - Requirements: Transaction handling, status update
  - [ ] Monthly rent payment
    - Requirements: Calculate correct amount, payment confirmation
  - [ ] Loan request and offer flow
    - Requirements: Request creation, offer submission, acceptance
  - [ ] Loan repayment
    - Requirements: Calculate payment with interest, update status

## 5. Finalize Implementation
- [ ] Add Error Handling
  - Requirements: User-friendly error messages, fallbacks for network issues
- [ ] Implement Loading States
  - Requirements: Indicators for transactions, data loading
- [ ] Add Minimal UI Feedback
  - Requirements: Success/error notifications, confirmation dialogs
- [ ] Optimize for Performance
  - Requirements: Minimize contract calls, implement basic caching

## 6. Documentation
- [ ] Complete Setup Instructions
  - Requirements: Clear steps for new developers
- [ ] Document Core Workflows
  - Requirements: Simple diagrams or descriptions for main features

# Using the Project with External Hardhat Node

This project works with an externally running Hardhat node and manually deployed contracts.

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
- No verification of contract artifacts is performed, so contracts can be deployed from any source
- All blockchain transactions will be executed on the external Hardhat node

This checklist provides comprehensive documentation while prioritizing a simple but functional implementation, building on the components that are already in place and focusing on the core functionality needed for the application to work with a local Hardhat node.
