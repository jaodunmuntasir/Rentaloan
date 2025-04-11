# Server-Side Implementation

## Abstract

This document presents a detailed analysis of the server-side implementation of our Blockchain-Based Rental Loan System. The back-end architecture serves as a bridge between the user interface and the blockchain, providing data persistence, authentication, and state synchronization. We explore the system's architecture, data model, API design, and blockchain integration patterns, highlighting how these components work together to create a robust decentralized application while maintaining traditional database reliability.

## 1. Introduction

The server-side implementation serves as the critical intermediary between the user interface and the Ethereum blockchain. Our implementation follows a modern Express-based architecture built with TypeScript that prioritizes:

1. **Data persistence and integrity** - For reliable record-keeping
2. **Authentication and authorization** - For secure access control
3. **Blockchain state synchronization** - For consistent application state
4. **Transaction verification** - For trustless operation validation

The implementation addresses several key challenges in blockchain-based applications, including the gap between blockchain's eventual consistency and traditional web applications' immediate consistency, secure wallet management without exposing private keys, and maintaining system integrity across both centralized and decentralized components.

We chose Express.js with TypeScript as our foundation due to its robust middleware system and type safety. This combination provides a flexible yet structured approach to API development, with static typing helping to prevent runtime errors when handling complex blockchain data structures. SQLite was selected as the database for its simplicity and file-based nature, making development and deployment straightforward while still providing relational database capabilities.

## 2. System Architecture

### 2.1 High-Level Architecture

Our server-side implementation follows a modular architecture pattern that separates concerns while maintaining clear communication paths between components.

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|      Routes      | <---> |     Services     | <---> |      Models      |
|                  |       |                  |       |                  |
+------------------+       +------------------+       +------------------+
        ^                          ^                          ^
        |                          |                          |
        v                          v                          v
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|    Middleware    | <---> |   Blockchain     | <---> |    Database      |
|                  |       |   Integration    |       |                  |
+------------------+       +------------------+       +------------------+
```

This modular architecture was deliberately chosen over alternatives like microservices or monolithic approaches. The separation of concerns allows for specialized handling of different aspects of the application while maintaining a unified codebase.

This approach has proven effective because:
1. It provides clear boundaries between authentication, business logic, and data access
2. It allows for independent evolution of blockchain interaction code
3. It enables consistent error handling across different modules
4. It simplifies testing by allowing components to be tested independently

### 2.2 Component Organization

The application's directory structure follows a logical organization by component type:

```
server/
├── config/               # Configuration files
│   ├── database.js       # Database configuration
│   ├── firebase.ts       # Firebase authentication setup
│   └── firebase-service-account.json
├── middleware/           # Express middleware
│   └── auth.ts           # Authentication middleware
├── models/               # Database models
│   ├── index.ts          # Database initialization
│   ├── user.model.ts
│   ├── rental-agreement.model.ts
│   ├── loan-request.model.ts
│   ├── loan-offer.model.ts
│   ├── loan-agreement.model.ts
│   └── payment.model.ts
├── routes/               # API routes
│   ├── auth.ts           # Authentication routes
│   ├── user.ts           # User management routes
│   ├── rental.ts         # Route aggregator for rental
│   ├── rental/           # Rental-specific routes
│   ├── loan.ts           # Route aggregator for loans
│   └── loan/             # Loan-specific routes
├── services/             # Business logic
│   ├── blockchain.service.ts # Blockchain integration
│   └── event.service.ts  # Event monitoring service
├── migrations/           # Database migrations
├── types/                # TypeScript type definitions
├── app.ts                # Main application entry point
├── database.sqlite       # SQLite database file
└── package.json          # Dependencies and scripts
```

This organization provides a clear separation of concerns and follows established Express.js conventions. Each component type has its own directory, making it easy to locate and modify specific parts of the application. The separation between routes and services allows for clean API definition while keeping business logic encapsulated.

## 3. Data Persistence Layer

### 3.1 Database Design

The application uses Sequelize ORM with SQLite for data persistence. We chose a relational database for its ACID properties and ability to enforce referential integrity, which is crucial for maintaining consistent state with the blockchain.

```
+----------------+       +--------------------+       +----------------+
|                |       |                    |       |                |
|      User      |<----->| Rental Agreement   |<----->| Loan Request   |
|                |       |                    |       |                |
+----------------+       +--------------------+       +----------------+
                                                          |
                                                          v
+----------------+       +--------------------+       +----------------+
|                |       |                    |       |                |
|    Payment     |<----->|  Loan Agreement    |<----->|  Loan Offer    |
|                |       |                    |       |                |
+----------------+       +--------------------+       +----------------+
```

SQLite was chosen over more complex database systems like PostgreSQL or MongoDB because:
1. It provides sufficient functionality for our application's needs
2. It simplifies development and deployment with its file-based nature
3. It requires minimal configuration while still offering SQL capabilities
4. It has excellent compatibility with Sequelize ORM

### 3.2 Model Design

The data model uses Sequelize TypeScript decorators to define entities and relationships:

**User Model**
```typescript
@Table({
  tableName: 'users',
  timestamps: true
})
export class User extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  firebaseId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  walletAddress!: string;
}
```

The models are carefully designed to:
1. Map blockchain entities to database records
2. Track the state of on-chain contracts
3. Maintain relationships between different entities
4. Store additional metadata not available on the blockchain

We chose the Sequelize-TypeScript decorator approach over alternatives like raw SQL or query builders because:
1. It provides a clear, type-safe way to define database schema
2. It enables object-oriented interaction with the database
3. It simplifies relationship management
4. It integrates well with TypeScript for type checking

## 4. Authentication and Authorization

### 4.1 Firebase Authentication Integration

The application uses Firebase Authentication for user management, with a custom middleware for token verification:

```typescript
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
```

We chose Firebase Authentication over custom JWT implementation or blockchain-based authentication for several reasons:
1. It provides a production-ready, secure authentication system
2. It handles token generation, verification, and expiration automatically
3. It offers built-in features like password reset and email verification
4. It simplifies the authentication flow while maintaining security

### 4.2 Wallet Management

A unique aspect of our system is how we manage blockchain wallets for users:

```typescript
const getAvailableWallet = async (): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const accounts = await provider.listAccounts();
    const usedAddresses = await User.findAll({ attributes: ["walletAddress"] });
    const usedAddressSet = new Set(
      usedAddresses.map((u) => u.walletAddress.toLowerCase())
    );

    // Find the first available account that isn't already assigned
    const availableAccount = accounts.find(
      (account) => !usedAddressSet.has(account.address.toLowerCase())
    )?.address;

    if (!availableAccount) {
      throw new Error("No available wallet addresses");
    }

    console.log(`Assigning wallet address: ${availableAccount}`);
    return availableAccount;
  } catch (error) {
    console.error("Error getting available wallet:", error);
    throw error;
  }
};
```

We implemented this wallet assignment approach instead of having users connect their own wallets or generating new wallets for several reasons:
1. It simplifies the user experience by removing the need for wallet setup
2. It enables controlled testing with predetermined accounts
3. It avoids the security risks of managing private keys on the server
4. It ensures each user has exactly one wallet address

## 5. API Design

### 5.1 RESTful Structure

The API follows RESTful principles with consistent endpoint patterns:

```
/api/auth                # Authentication endpoints
  ├── /register          # Register a new user
  ├── /profile           # Get user profile
  └── /profile (PUT)     # Update user profile

/api/user                # User-related endpoints
  ├── /profile           # User profile management
  └── /dashboard         # User dashboard data

/api/rental              # Rental agreement endpoints
  ├── /create            # Create rental agreement
  ├── /:address          # Get rental agreement details
  ├── /:address/pay-deposit # Pay security deposit
  └── /:address/pay-rent # Pay rent

/api/loan                # Loan management endpoints
  ├── /request           # Loan request operations
  │   ├── /create        # Create a loan request
  │   └── /:id           # Get loan request details
  ├── /offer             # Loan offer operations
  │   ├── /create        # Create a loan offer
  │   └── /:id           # Get loan offer details
  └── /agreement         # Loan agreement operations
      ├── /create        # Create a loan agreement
      └── /:address      # Get loan agreement details
```

We chose a RESTful API design over alternatives like GraphQL or RPC for several reasons:
1. It provides a clear, resource-oriented structure
2. It leverages HTTP methods for appropriate operations (GET, POST, PUT, DELETE)
3. It simplifies API consumption for client applications
4. It follows widely understood conventions for web APIs

### 5.2 Request Handling Pattern

The application uses a consistent pattern for handling API requests:

```typescript
const handler: RequestHandler = async (req, res): Promise<void> => {
  try {
    // 1. Extract and validate input from request
    const { param1, param2 } = req.body;
    
    if (!param1 || !param2) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }
    
    // 2. Perform business logic
    const result = await someService.performOperation(param1, param2);
    
    // 3. Return appropriate response
    res.status(200).json({
      message: "Operation successful",
      data: result
    });
  } catch (error) {
    // 4. Handle errors consistently
    console.error("Operation error:", error);
    res.status(500).json({ 
      message: "Operation failed", 
      error: (error as Error).message 
    });
  }
};
```

This pattern provides consistent error handling, input validation, and response formatting across all endpoints. We adopted this approach rather than using a framework-specific validation library to maintain simplicity while ensuring robustness.

## 6. Blockchain Integration

### 6.1 Read-Only Blockchain Interaction

The server interacts with the blockchain in a primarily read-only manner, verifying transactions rather than initiating them:

```typescript
export const verifyLoanInitialization = async (
  contractAddress: string,
  lenderWalletAddress: string,
  transactionHash: string
) => {
  try {
    // 1. Get transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction failed or not found');
    }
    
    // 2. Verify the transaction was sent to the correct contract
    if (receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      throw new Error('Transaction was not sent to the expected contract');
    }
    
    // 3. Get contract details after the transaction
    const loanContract = await getLoanAgreementContract(contractAddress);
    const lender = await loanContract.getLender();
    const status = await loanContract.getStatus();
    
    // 4. Verify the lender and status match expectations
    if (lender.toLowerCase() !== lenderWalletAddress.toLowerCase()) {
      throw new Error('Transaction did not set the expected lender');
    }
    
    if (status !== 1) { // 1 corresponds to READY status
      throw new Error('Loan status is not READY after initialization');
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying loan initialization:', error);
    throw error;
  }
};
```

We adopted this verification-based approach instead of directly initiating blockchain transactions for several reasons:
1. It maintains separation between client-side transaction signing and server-side verification
2. It avoids the need to store private keys on the server
3. It respects the decentralized nature of blockchain by giving users control over their transactions
4. It provides a security model where the server only verifies what happened on-chain

### 6.2 Event Monitoring

The application includes an event service that monitors blockchain events and updates the database accordingly:

```typescript
const listenToRentalAgreementEvents = async (contractAddress: string) => {
  try {
    const RentalAgreementArtifact = loadArtifact('RentalAgreement');
    const rentalContract = new ethers.Contract(
      contractAddress,
      RentalAgreementArtifact.abi,
      provider
    );
    
    // Listen for security deposit paid event
    rentalContract.on('SecurityDepositPaid', async (amount, event) => {
      try {
        const rental = await RentalAgreement.findOne({
          where: { contractAddress: contractAddress.toLowerCase() }
        });
        
        if (rental) {
          // Update rental status to ACTIVE
          await rental.update({
            status: RentalAgreementStatus.ACTIVE,
            startDate: new Date()
          });
          
          // Create payment record
          await Payment.create({
            rentalAgreementId: rental.id,
            amount: ethers.formatEther(amount),
            date: new Date(),
            type: PaymentType.SECURITY_DEPOSIT,
            txHash: event.transactionHash
          });
          
          console.log(`Security deposit paid for rental ${contractAddress}`);
        }
      } catch (error) {
        console.error(`Error processing SecurityDepositPaid event:`, error);
      }
    });
    
    // Additional event listeners...
  } catch (error) {
    console.error(`Error setting up listeners for ${contractAddress}:`, error);
  }
};
```

This event-driven approach was implemented because:
1. It ensures the database stays in sync with the blockchain state
2. It decouples state updates from API calls
3. It allows the system to recover from missed events by re-processing historical data
4. It provides a clean separation between user actions and system reactions

## 7. Business Logic Organization

### 7.1 Service Layer Pattern

The application implements a service layer to encapsulate complex business logic:

```typescript
export const getRentalAgreementDetails = async (contractAddress: string) => {
  try {
    const rentalContract = await getRentalAgreementContract(contractAddress);
    
    // Get details from the blockchain
    const details = await rentalContract.getContractDetails();
    
    // Transform blockchain data into application data model
    return {
      landlord: details[0],
      renter: details[1],
      rentalDuration: Number(details[2]),
      securityDeposit: ethers.formatEther(details[3]),
      baseRent: ethers.formatEther(details[4]),
      status: Number(details[5]),
      startTime: new Date(Number(details[6]) * 1000),
      gracePeriod: Number(details[7])
    };
  } catch (error) {
    console.error('Error getting rental agreement details:', error);
    throw error;
  }
};
```

The service layer was chosen over embedding this logic in routes because:
1. It centralizes complex operations for reuse across different routes
2. It separates business rules from HTTP request handling
3. It provides a clean interface for blockchain interactions
4. It simplifies testing by isolating business logic

### 7.2 Data Transformation and Mapping

The application includes logic to transform between blockchain and application data models:

```typescript
async getRepaymentsSummary(): Promise<{
  totalPaid: number;
  totalRemaining: number;
  paymentsCompleted: number;
  paymentsRemaining: number;
  nextPaymentDue: number | null;
  progress: number;
  paymentsByMonth: Record<number, number>;
}> {
  // Get all loan repayments
  const payments = await Payment.findAll({
    where: { 
      loanAgreementId: this.id,
      type: 'LOAN_REPAYMENT'
    }
  });
  
  // Calculate total paid
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  
  // Calculate total remaining
  const totalRepayment = this.calculateTotalRepayment();
  const totalRemaining = Math.max(0, totalRepayment - totalPaid);
  
  // Calculate progress percentage
  const progress = Math.min(100, Math.round((totalPaid / totalRepayment) * 100));
  
  // Additional calculation logic...
  
  return {
    totalPaid,
    totalRemaining,
    paymentsCompleted,
    paymentsRemaining,
    nextPaymentDue,
    progress,
    paymentsByMonth
  };
}
```

This approach to data transformation was implemented because:
1. It enriches raw blockchain data with derived properties needed by the UI
2. It handles numeric conversions between blockchain units (wei) and application units (ether)
3. It computes aggregate statistics that would be inefficient to calculate client-side
4. It provides a consistent data model regardless of blockchain implementation details

## 8. Security Implementation

### 8.1 Authentication Flow

The server implements a secure authentication flow using Firebase:

```
+-------------+       +-------------------+       +------------------+
|             |       |                   |       |                  |
|    Client   | ----> | Firebase Auth API | ----> | ID Token         |
|             |       |                   |       |                  |
+-------------+       +-------------------+       +------------------+
       |                                                  |
       |                                                  v
       |                                          +------------------+
       |                                          |                  |
       |                                          | Token Validation |
       |                                          |                  |
       |                                          +------------------+
       |                                                  |
       v                                                  v
+-------------+       +-------------------+       +------------------+
|             |       |                   |       |                  |
| API Request | ----> | Auth Middleware   | ----> | Protected Route  |
|             |       |                   |       |                  |
+-------------+       +-------------------+       +------------------+
```

This flow was chosen because:
1. It leverages Firebase's secure token generation and validation
2. It isolates authentication from the main application logic
3. It provides a stateless authentication mechanism suitable for API services
4. It follows industry best practices for JWT-based authentication

### 8.2 Input Validation

The server validates input data to prevent security issues and ensure data integrity:

```typescript
// Validate loan request parameters
if (!rentalAgreementAddress || !amount || !duration || !interestRate) {
  return res.status(400).json({ 
    message: 'Missing required parameters',
    success: false 
  });
}

// Validate numeric values
if (parseFloat(amount) <= 0) {
  return res.status(400).json({ 
    message: 'Amount must be greater than 0',
    success: false 
  });
}

if (duration <= 0 || !Number.isInteger(duration)) {
  return res.status(400).json({ 
    message: 'Duration must be a positive integer',
    success: false 
  });
}

if (interestRate <= 0) {
  return res.status(400).json({ 
    message: 'Interest rate must be greater than 0',
    success: false 
  });
}
```

This validation approach was implemented because:
1. It prevents invalid data from entering the system
2. It provides clear error messages for client applications
3. It reduces the risk of database corruption or unexpected behavior
4. It acts as the first line of defense against injection attacks

## 9. Synchronization Between Blockchain and Database

### 9.1 Event-Driven Synchronization

The server maintains consistency between blockchain and database through event monitoring:

```typescript
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
```

This event-driven approach was chosen because:
1. It ensures the database reflects the current blockchain state
2. It handles asynchronous nature of blockchain confirmations
3. It provides an audit trail of blockchain events
4. It allows recovery from server downtime or missed events

### 9.2 Transaction Verification

For user-reported transactions, the server verifies them before updating records:

```typescript
const verifyPayment = async (
  contractAddress: string,
  transactionHash: string,
  expectedAmount: string,
  paymentType: PaymentType
) => {
  try {
    // Get transaction receipt from blockchain
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction failed or not found');
    }
    
    // Verify transaction was sent to the expected contract
    if (receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      throw new Error('Transaction was not sent to the expected contract');
    }
    
    // Verify transaction value matches expected amount
    const transaction = await provider.getTransaction(transactionHash);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    const actualAmount = ethers.formatEther(transaction.value);
    if (actualAmount !== expectedAmount) {
      throw new Error(`Expected payment of ${expectedAmount} ETH but found ${actualAmount} ETH`);
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};
```

This verification approach was implemented because:
1. It prevents users from falsely claiming transactions
2. It ensures database records match actual blockchain transactions
3. It maintains data integrity across systems
4. It provides a trustless verification mechanism aligned with blockchain principles

## 10. Error Handling Strategy

The server implements consistent error handling across different components:

```typescript
try {
  // Business logic
} catch (error) {
  // Log the error with context
  console.error('Operation context:', error);
  
  // Determine appropriate status code
  let statusCode = 500;
  if (error.message.includes('not found')) {
    statusCode = 404;
  } else if (error.message.includes('unauthorized')) {
    statusCode = 401;
  } else if (error.message.includes('invalid input')) {
    statusCode = 400;
  }
  
  // Return structured error response
  res.status(statusCode).json({ 
    message: 'Operation failed', 
    error: error.message,
    success: false
  });
}
```

This error handling strategy was chosen because:
1. It provides consistent error responses across all API endpoints
2. It includes appropriate HTTP status codes for different error types
3. It logs detailed error information for debugging
4. It presents user-friendly error messages to clients

## 11. Conclusion

The server-side implementation of our Blockchain-Based Rental Loan System demonstrates a practical approach to integrating traditional web services with blockchain technology. By leveraging Express.js, Sequelize ORM, and ethers.js, we've created a robust backend that bridges the gap between the immediate consistency expectations of web applications and the eventual consistency of blockchain networks.

Our architecture effectively separates concerns between authentication, business logic, data persistence, and blockchain interaction, creating a maintainable and extensible application. The event-driven synchronization approach ensures data consistency while respecting the decentralized nature of blockchain transactions.

The combination of Firebase Authentication, SQLite database, and Ethereum blockchain integration provides a balance between security, data integrity, and decentralized trust. This hybrid approach allows us to leverage the strengths of both traditional web services and blockchain technology, creating a system that maintains reliable records while enabling trustless contract execution.

While there are opportunities for further development in areas like scalability, error recovery, and real-time notifications, the current implementation successfully delivers a functioning bridge between traditional web applications and blockchain smart contracts.

## References

1. Express.js Documentation: https://expressjs.com/
2. Sequelize Documentation: https://sequelize.org/
3. ethers.js Documentation: https://docs.ethers.org/
4. Firebase Authentication: https://firebase.google.com/docs/auth 