# Blockchain-Based Rental Loan System

A decentralized application for managing rental agreements and loans secured by rental deposits, providing financial flexibility in the housing market.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Routes](#frontend-routes)
- [Authentication Flow](#authentication-flow)
- [Usage Workflows](#usage-workflows)
- [Development](#development)
- [Security Considerations](#security-considerations)

## Overview

This application enables landlords, renters, and lenders to interact in a decentralized ecosystem, where rental agreements are created on-chain, and renters can obtain loans using their security deposits as collateral.

## Features

- On-chain rental agreements between landlords and renters
- Security deposit management
- Rent payment and skipping functionality
- Loan marketplace for renters to get loans using their security deposits
- Automated loan repayment tracking
- Integration with Hardhat for local blockchain development
- User authentication via Firebase
- Mobile-responsive UI with shadcn/ui components

## Architecture

The application follows a three-tier architecture:

1. **Frontend**: React with TypeScript, shadcn/ui, and ethers.js
2. **Backend**: Express.js with TypeScript and Sequelize ORM
3. **Blockchain**: Solidity smart contracts deployed on a Hardhat local network

### Technology Stack

- **Smart Contracts**: Solidity, Hardhat, TypeScript
- **Frontend**: React, TypeScript, shadcn/ui, ethers.js, TailwindCSS
- **Backend**: Express.js, TypeScript, Sequelize ORM
- **Database**: SQLite
- **Authentication**: Firebase Authentication
- **Testing**: Jest, Waffle, Ethers.js

## Prerequisites

- Node.js (v16+)
- npm (v8+)
- Git
- Visual Studio Code (recommended)
- PowerShell/Command Prompt

## Environment Setup

### 1. Project Initialization

```powershell
# Create and navigate to project directory
mkdir rental-loan-dapp
cd rental-loan-dapp

# Initialize git repository
git init

# Create project structure
mkdir contracts
mkdir scripts
mkdir client
mkdir server
mkdir config
```

### 2. Hardhat Setup

```powershell
# Initialize npm in root directory
npm init -y

# Install Hardhat and related packages
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai @openzeppelin/contracts dotenv

# Install TypeScript support for Hardhat
npm install --save-dev typescript ts-node @types/node @types/mocha @typechain/hardhat @typechain/ethers-v5 typechain

# Initialize Hardhat with TypeScript
npx hardhat init
# Select "Create a TypeScript project"
```

Create/edit the `hardhat.config.ts` file:

```typescript
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    }
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
```

### 3. Smart Contract Deployment

Create a deployment script at `scripts/deploy.ts`:
Factory contracts are manually deployed and Hardhat node is manually started outside this project for global use.

### 4. Frontend Setup

```powershell
# Navigate to client folder
cd client

# Create React app with TypeScript template
npx create-react-app . --template typescript

# Install frontend dependencies
npm install ethers react-router-dom firebase
npm install -D tailwindcss postcss autoprefixer

# Initialize TailwindCSS
npx tailwindcss init -p

# Install shadcn/ui dependencies
npm install @radix-ui/react-icons class-variance-authority clsx tailwind-merge
```

Update `client/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Add other shadcn/ui colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

Create global CSS in `client/src/index.css`.

### 5. Backend Setup

```powershell
# Navigate to server folder
cd ../server

# Initialize npm
npm init -y

# Install backend dependencies
npm install express cors helmet sqlite3 sequelize sequelize-cli firebase-admin dotenv

# Install TypeScript development dependencies
npm install --save-dev typescript ts-node @types/node @types/express @types/cors nodemon

# Install Sequelize TypeScript support
npm install --save-dev @types/validator sequelize-typescript
```

Create `tsconfig.json` in the server folder:

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6. Database Configuration

Create a database configuration file at `server/config/database.js`:

```javascript
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite'
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  production: {
    dialect: 'sqlite',
    storage: './database.sqlite'
  }
};
```

### 7. Firebase Authentication Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Navigate to Authentication and enable Email/Password sign-in
4. Go to Project Settings > Service Accounts
5. Generate a new private key and download it
6. Place the JSON file in the server/config folder (rename to `firebase-service-account.json`)

Create a Firebase initialization file at `server/config/firebase.ts`:

```typescript
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in environment variables');
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(path.resolve(serviceAccountPath))
});

export default admin;
```

Also, create a Firebase client configuration at `client/src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
```

### 8. Root Project Setup

Update `package.json` in the root directory:

```json
{
  "name": "rental-loan-dapp",
  "version": "1.0.0",
  "scripts": {
    "start:hardhat": "npx hardhat node",
    "deploy:contracts": "npx hardhat run scripts/deploy.ts --network localhost",
    "start:server": "cd server && npm run dev",
    "start:client": "cd client && npm start",
    "dev": "concurrently \"npm run start:hardhat\" \"npm run start:server\" \"npm run start:client\""
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
```

## Project Structure

```
rental-loan-dapp/
├── contracts/                    # Smart contracts
│   ├── LoanAgreement.sol
│   ├── LoanAgreementFactory.sol
│   ├── RentalAgreement.sol
│   ├── RentalAgreementFactory.sol
│   └── interfaces/              # Contract interfaces
├── scripts/                      # Deployment scripts
│   └── deploy.ts
├── client/                       # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── contexts/            # Context providers
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── utils/               # Utility functions
│   │   ├── config/              # Configuration
│   │   ├── types/               # TypeScript type definitions
│   │   ├── App.tsx              # Main App component
│   │   └── index.tsx            # Entry point
│   ├── package.json
│   └── tsconfig.json
├── server/                       # Express backend
│   ├── config/                   # Configuration
│   ├── models/                   # Database models
│   ├── routes/                   # API routes
│   ├── middleware/               # Express middleware
│   ├── controllers/              # Route controllers
│   ├── services/                 # Business logic
│   ├── app.ts                    # Express app
│   ├── package.json
│   └── tsconfig.json
├── config/                       # Global configuration
│   └── contractAddresses.json    # Deployed contract addresses
├── hardhat.config.ts             # Hardhat configuration
├── package.json                  # Root package.json
└── .env                          # Environment variables
```

## Smart Contracts

The system consists of four main contracts:

1. **RentalAgreement.sol**: Manages the rental agreement between landlord and renter
2. **RentalAgreementFactory.sol**: Creates and tracks rental agreements
3. **LoanAgreement.sol**: Manages loans secured by rental security deposits
4. **LoanAgreementFactory.sol**: Creates and tracks loan agreements

Key contract features:
- Security deposit management
- Rent payment tracking
- Grace period handling for missed payments
- Collateral management for loans
- Automated repayment schedules

## Database Schema

### User
- `id` (Primary Key)
- `firebaseId` (Unique)
- `email`
- `role` (landlord, renter, lender)
- `walletAddress` (Unique)
- `createdAt`
- `updatedAt`

### RentalAgreement
- `id` (Primary Key)
- `contractAddress` (Unique)
- `landlordId` (Foreign Key -> User)
- `renterId` (Foreign Key -> User)
- `name`
- `status` (INITIALIZED, ACTIVE, CLOSED)
- `duration`
- `securityDeposit`
- `baseRent`
- `gracePeriod`
- `createdAt`
- `updatedAt`

### LoanRequest
- `id` (Primary Key)
- `rentalAgreementId` (Foreign Key -> RentalAgreement)
- `requesterId` (Foreign Key -> User)
- `amount`
- `duration`
- `status` (OPEN, MATCHED, CLOSED, CANCELLED)
- `createdAt`
- `updatedAt`

### LoanOffer
- `id` (Primary Key)
- `loanRequestId` (Foreign Key -> LoanRequest)
- `lenderId` (Foreign Key -> User)
- `interestRate`
- `duration`
- `graceMonths`
- `status` (PENDING, ACCEPTED, REJECTED, WITHDRAWN)
- `createdAt`
- `updatedAt`

### LoanAgreement
- `id` (Primary Key)
- `contractAddress` (Unique)
- `loanRequestId` (Foreign Key -> LoanRequest)
- `borrowerId` (Foreign Key -> User)
- `lenderId` (Foreign Key -> User)
- `amount`
- `interestRate`
- `duration`
- `graceMonths`
- `status` (CREATED, ACTIVE, CLOSED)
- `startDate`
- `createdAt`
- `updatedAt`

### Payment
- `id` (Primary Key)
- `rentalAgreementId` (Optional Foreign Key -> RentalAgreement)
- `loanAgreementId` (Optional Foreign Key -> LoanAgreement)
- `payerId` (Foreign Key -> User)
- `recipientId` (Foreign Key -> User)
- `amount`
- `txHash` (Transaction hash)
- `type` (SECURITY_DEPOSIT, RENT, LOAN_REPAYMENT, LOAN_INITIALIZATION)
- `month` (The payment month)
- `paymentDate`
- `createdAt`
- `updatedAt`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile

### Rental
- `POST /api/rental/create` - Create rental agreement
- `GET /api/rental` - Get user's rental agreements
- `GET /api/rental/:address` - Get rental agreement details
- `POST /api/rental/:address/pay-deposit` - Pay security deposit
- `POST /api/rental/:address/pay-rent` - Pay rent
- `POST /api/rental/:address/skip-rent` - Skip rent
- `POST /api/rental/:address/extend` - Extend rental agreement

### Loan
- `POST /api/loan/request` - Create loan request
- `GET /api/loan/requests` - Get all loan requests
- `GET /api/loan/requests/:id` - Get loan request details
- `POST /api/loan/offer` - Create loan offer
- `GET /api/loan/offers` - Get user's loan offers
- `POST /api/loan/offer/:id/accept` - Accept loan offer
- `POST /api/loan/offer/:id/withdraw` - Withdraw loan offer
- `GET /api/loan/:address` - Get loan agreement details
- `POST /api/loan/:address/initialize` - Initialize loan
- `POST /api/loan/:address/repay` - Make loan repayment

## Frontend Routes

- `/` - Dashboard
- `/login` - Login page
- `/register` - Registration page
- `/profile` - User profile
- `/rental/create` - Create rental agreement
- `/rental/:address` - View rental agreement details
- `/rental/:address/pay` - Pay rent
- `/rental/:address/loan/request` - Create loan request
- `/loans/requests` - Browse loan requests
- `/loans/offers` - View loan offers
- `/rental/:rentalAddress/loan/:loanAddress` - View loan details
- `/rental/:rentalAddress/loan/:loanAddress/repay` - Make loan repayment

## Authentication Flow

1. **User Registration**:
   - User submits email, password, role
   - Backend creates Firebase Auth user
   - Backend assigns a unique Hardhat wallet address
   - User data stored in database

2. **User Login**:
   - User authenticates with Firebase Auth
   - Firebase returns ID token
   - Frontend stores token in local storage
   - User profile loaded from backend API

3. **API Authentication**:
   - Frontend includes token in Authorization header
   - Backend middleware verifies token with Firebase Admin
   - User identity attached to request object

## Usage Workflows

### Landlord Workflow

1. **Create Rental Agreement**:
   - Specify renter's email, duration, security deposit, base rent
   - System calculates grace period automatically (security deposit / base rent)
   - Deploy contract to blockchain

2. **Extend Agreement**:
   - Available in the last month of the agreement
   - Add additional months to the duration

### Renter Workflow

1. **Pay Security Deposit**:
   - After landlord creates agreement
   - Pay full security deposit amount
   - Agreement becomes active

2. **Pay Monthly Rent**:
   - Pay rent for each month during the rental period
   - Option to skip payments if within grace period
   - Cannot skip the final month

3. **Request Loan**:
   - Create loan request specifying amount and duration
   - Amount must be less than available collateral
   - View and accept loan offers

4. **Repay Loan**:
   - Make monthly repayments according to schedule
   - When fully repaid, collateral is returned to rental agreement

### Lender Workflow

1. **Browse Loan Requests**:
   - View available loan requests in the marketplace
   - See rental agreement details for each request

2. **Make Loan Offer**:
   - Specify interest rate, duration, grace months
   - Submit offer to borrower

3. **Initialize Loan**:
   - When offer is accepted, fund the loan
   - Collateral withdrawn from rental agreement
   - Funds transferred to rental contract

## Development

To start the development environment:

```powershell
# Start Hardhat node (local blockchain)
npm run start:hardhat

# In a new terminal, deploy contracts
npm run deploy:contracts

# Start the full development environment
npm run dev
```

This will start:
1. A local Hardhat blockchain node
2. The Express backend server
3. The React frontend development server

You can now access your application at `http://localhost:3000` and the backend API at `http://localhost:5000`.

## Security Considerations

1. **Authentication**: Firebase Auth provides secure user authentication
2. **Authorization**: Role-based access control restricts API endpoints
3. **Input Validation**: All inputs are validated on both client and server
4. **Transaction Signing**: Only the assigned wallet can sign transactions
5. **Wallet Assignment**: Each user is assigned a unique wallet address
6. **Error Handling**: Comprehensive error handling prevents information leakage

---

This project demonstrates how blockchain technology can enhance the rental market by providing financial flexibility to renters while maintaining security for landlords and lenders.
