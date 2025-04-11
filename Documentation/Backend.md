# Backend Architecture and Implementation

## Introduction

In this chapter, we present a comprehensive analysis of the backend architecture for our Blockchain-Based Rental Loan System. The backend serves as the critical bridge between the user-facing frontend application and the blockchain infrastructure, orchestrating the complex interactions between traditional web services and decentralized blockchain operations. Our implementation employs a Node.js/Express framework integrated with Ethereum blockchain interactions, creating a hybrid architecture that balances the requirements of both paradigms.

The backend architecture addresses the unique challenges of integrating conventional database persistence with immutable blockchain records. This chapter explores the architectural decisions and implementation strategies we've employed to create this integration while maintaining security, performance, and data integrity.

## Architectural Overview

### System Architecture Principles

Our backend architecture follows a service-oriented approach using Node.js with Express, structured around several core architectural principles:

1. **Hybrid Persistence Model**: We've implemented a dual-storage paradigm that maintains appropriate data in both a relational database (using Sequelize ORM with SQLite) and on the Ethereum blockchain through smart contracts.

2. **Event-Driven Synchronization**: Our system uses blockchain events to maintain synchronization between on-chain data and database records, ensuring consistency despite the distributed nature of the system.

3. **Authentication Integration**: We employ Firebase Authentication for user management while linking traditional user accounts with Ethereum wallet addresses.

4. **Service-Based Design**: Core functionality is organized into modular services that handle specific concerns such as blockchain interaction and event processing.

The resulting architecture can be visualized as a series of interconnected layers:

```
+-----------------+     +-----------------+     +-----------------+
|                 |     |                 |     |                 |
|  API Layer      |<--->| Service Layer   |<--->| Blockchain      |
|  (Express)      |     | (Business Logic)|     | Interaction     |
|                 |     |                 |     | Layer           |
+-----------------+     +-----------------+     +-----------------+
                              ^                        ^
                              |                        |
                              v                        v
                       +-----------------+     +-----------------+
                       |                 |     |                 |
                       | Database        |<--->| Smart Contract  |
                       | Access Layer    |     | Layer          |
                       | (Sequelize)     |     | (Ethers.js)    |
                       +-----------------+     +-----------------+
```

### Key Technologies

Our backend implementation leverages several key technologies:

1. **Node.js and Express**: Provides the foundation for our HTTP API and server infrastructure.

2. **Sequelize ORM**: Enables type-safe database operations with SQLite (development) and PostgreSQL (production).

3. **Ethers.js**: Facilitates interaction with Ethereum smart contracts and blockchain events.

4. **Firebase Authentication**: Manages user authentication and security.

5. **TypeScript**: Ensures type safety and improves code maintainability throughout the codebase.

## Authentication System

### Firebase Integration

We've implemented a comprehensive authentication system using Firebase Authentication, which provides secure user management while maintaining compatibility with blockchain wallet requirements.

The authentication flow works as follows:

1. Users register and authenticate through Firebase Authentication.
2. Upon registration, our system automatically assigns an Ethereum wallet address from our local development node (in a production environment, users would connect their own wallets).
3. The user's Firebase ID is linked to their database record, which includes their wallet address.
4. For authenticated API requests, we use Firebase token verification through middleware:

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

This authentication flow provides secure identity verification while allowing users to interact with blockchain contracts through their assigned wallet addresses.

## Data Architecture

The data architecture of our system represents a significant design challenge, as it must integrate two fundamentally different data paradigms: traditional relational databases and blockchain-based smart contract storage.

### Database Schema

Our database schema uses Sequelize ORM with TypeScript models to define the application's core entities:

1. **User**: Stores user information, including Firebase ID and Ethereum wallet address.
2. **RentalAgreement**: Maintains rental agreements with references to on-chain contracts.
3. **LoanRequest**: Records requests for loans against rental deposits.
4. **LoanOffer**: Tracks offers made in response to loan requests.
5. **LoanAgreement**: Maintains loan agreements with references to on-chain contracts.
6. **Payment**: Records payments for both rentals and loans.

These models demonstrate our hybrid approach to data management. For example, the `RentalAgreement` model contains:

```typescript
@Table({
  tableName: 'rental_agreements',
  timestamps: true
})
export class RentalAgreement extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  contractAddress!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  landlordId!: number;

  @BelongsTo(() => User, 'landlordId')
  landlord!: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  renterId!: number;

  @BelongsTo(() => User, 'renterId')
  renter!: User;

  // Other fields...
}
```

This model maintains a `contractAddress` field that references the on-chain smart contract, creating a clear link between database records and blockchain state.

### Blockchain Integration

Our blockchain integration layer uses Ethers.js to interact with Ethereum smart contracts. The system defines TypeScript interfaces for each contract type, ensuring type safety when working with contract methods.

The blockchain service provides methods to interact with these contracts, handling read operations (querying state).

## Event Processing System

A critical component of our architecture is the event processing system that maintains synchronization between blockchain state and database records. This system continuously monitors blockchain events emitted by our smart contracts and updates the database accordingly.

The event service:

1. Initializes listeners for factory contracts (RentalAgreementFactory and LoanAgreementFactory)
2. Sets up listeners for existing agreements in the database
3. Processes events such as agreement creation, payment processing, and status changes

This approach ensures that the database state remains synchronized with blockchain state, providing a consistent view of agreements and transactions.

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Contract Event    |---->| Event Processing  |---->| Database          |
| Listeners         |     | Logic             |     | Updates           |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        ^
        |
        v
+-------------------+
|                   |
| Blockchain        |
| Smart Contracts   |
|                   |
+-------------------+
```
*Figure 1: Event Processing System*

## API Design

Our API follows RESTful principles organized around business domains rather than technical implementation details. The main routes include:

1. **/api/auth**: Handles user registration, authentication, and profile management
2. **/api/rental**: Manages rental agreement creation, details, and operations
3. **/api/loan**: Handles loan requests, offers, and management
4. **/api/user**: Provides user-specific data, including dashboard information

Each API endpoint uses middleware for authentication and follows consistent response patterns. For example, our user dashboard endpoint aggregates multiple types of data into a single response.

This API design abstracts the complexity of blockchain operations behind familiar REST endpoints, making it easier for the frontend to interact with both database and blockchain data.

## Key Workflows

### Rental Agreement Creation Workflow

The rental agreement creation workflow demonstrates our approach to managing complex processes that span user authentication, data validation, and smart contract deployment.

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| API Request       |---->| Validate Request  |---->| Prepare Contract  |
| Authentication    |     | and Parameters    |     | Parameters        |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
                                                          |
                                                          v
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Database Update   |<----| Event            |<----| Smart Contract    |
| from Events       |     | Listeners        |     | Deployment        |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```
*Figure 2: Rental Agreement Creation Workflow*

The process begins when a user submits a request to create a rental agreement. The API authenticates the request, validates parameters, and then interacts with the blockchain service to deploy a new smart contract. Once deployed, event listeners detect the contract creation and update the database accordingly.

### Loan Request and Matching Workflow

The loan request workflow demonstrates the interaction between traditional database operations and blockchain transactions:

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Create Loan       |---->| Store in Database |---->| Make Available    |
| Request           |     | with Status=OPEN  |     | in Marketplace    |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
         ^                                                 |
         |                                                 v
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Deploy Loan       |<----| Accept Offer      |<----| Receive Loan      |
| Contract          |     |                   |     | Offers            |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```
*Figure 3: Loan Request and Matching Workflow*

In this workflow, loan requests are initially managed through database operations, allowing for efficient marketplace functionality. Once a match is made, the system transitions to blockchain operations by deploying a loan contract.

### Payment Processing Workflow

The payment processing workflow demonstrates how our system handles financial transactions between users through the blockchain:

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Initiate Payment  |---->| Validate Payment  |---->| Submit            |
| Request           |     | Parameters        |     | Transaction       |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
                                                          |
                                                          v
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Record Payment    |<----| Process Payment   |<----| Monitor           |
| in Database       |     | Event             |     | Transaction       |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```
*Figure 4: Payment Processing Workflow*

This workflow begins with a payment request, which is validated and then submitted as a blockchain transaction. The system monitors the transaction status and, upon confirmation, processes the payment event to update database records.

## Conclusion

Our backend architecture for the Blockchain-Based Rental Loan System successfully integrates traditional web service patterns with blockchain technology. Through careful design choices, we've created a system that leverages the strengths of both paradigms—the flexibility and performance of traditional databases combined with the security and immutability of blockchain contracts.

Key innovations in our implementation include:

1. The hybrid data model that clearly separates on-chain and off-chain data responsibilities
2. The event-driven synchronization system that maintains consistency between blockchain and database
3. The integration of Firebase Authentication with Ethereum wallet addresses
4. The service-based architecture that encapsulates blockchain complexities

This architecture provides a solid foundation for our rental and loan management system, enabling secure financial agreements while maintaining an intuitive user experience. 