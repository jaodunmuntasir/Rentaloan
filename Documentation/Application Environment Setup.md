# Application Environment Setup

## Prerequisites

Before setting up the Blockchain-Based Rental Loan System, ensure you have the following prerequisites installed:

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Latest stable version for version control
- **Visual Studio Code**: Recommended IDE for development
- **PowerShell/Command Prompt**: For running commands

## Application Architecture

Our application follows a three-tier architecture, incorporating blockchain technology for decentralized contract execution alongside traditional web technologies for the user interface and data management.

### Frontend

The frontend is built with React and TypeScript, providing a responsive and interactive user interface:

- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: React Context API (AuthContext, WalletContext, ContractContext)
- **Routing**: React Router v6
- **Blockchain Interaction**: ethers.js v6.7.0
- **Authentication**: Firebase Authentication

Key frontend components:
- WalletContext for blockchain wallet integration
- ContractContext for smart contract interactions
- AuthContext for user authentication and management
- Modular page components for different application features

### Backend

The backend serves as a bridge between the frontend and the blockchain, handling user data, transaction history, and business logic:

- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Sequelize ORM
- **Authentication**: Firebase Admin SDK
- **API**: RESTful endpoints for user management, rental agreements, and loans

Key backend components:
- User management and profile storage
- Rental and loan agreement tracking
- Loan requests and offers marketplace
- Payment history and analytics

### Authentication

We implement a robust authentication system that combines Firebase Authentication for user identity with blockchain wallet assignment:

- Firebase Authentication for email/password login
- JWT token validation for API access control
- Each user is assigned a dedicated wallet address
- The wallet address is linked to the user profile in the database
- Authentication context in the frontend manages user session and token refresh

### Blockchain

#### On-Chain Activities Happen Only on Client Side

All blockchain interactions occur directly from the client side to maintain decentralization and security:

1. Smart contract calls are made directly from the browser using ethers.js
2. Private keys never leave the client environment
3. The backend only tracks and records the results of blockchain transactions
4. Transaction hashes are stored in the database for reference and verification
5. Backend never initiates blockchain transactions on behalf of users

#### Running the Deployment Script

Our deployment script (`scripts/deploy.ts`) is designed to verify and configure the smart contracts for the application:

1. The script connects to the local Hardhat node running at `http://127.0.0.1:8545`.
2. It verifies that both factory contracts are already deployed at their expected addresses.
3. The script checks for deployed bytecode at each address to confirm the contracts exist.
4. It then saves these addresses to a configuration file at `config/contractAddresses.json`.
5. This configuration file is used by both the frontend and backend to locate the contracts.

To run the deployment script:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Note that our deployment process assumes the contracts have been manually deployed. The script does not deploy the contracts itself but rather verifies and configures their addresses for the application.
