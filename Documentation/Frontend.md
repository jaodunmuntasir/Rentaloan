# Frontend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Setup and Installation](#setup-and-installation)
4. [Core Technologies](#core-technologies)
5. [Authentication System](#authentication-system)
6. [Blockchain Integration](#blockchain-integration)
7. [State Management with Context API](#state-management-with-context-api)
8. [Component Library](#component-library)
9. [Routing](#routing)
10. [Key Features Implementation](#key-features-implementation)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

## Architecture Overview

The frontend of our Blockchain-Based Rental Loan System is built with React, TypeScript, and ethers.js to provide a modern, type-safe user interface that directly interacts with the Ethereum blockchain. The architecture follows these key principles:

1. **Component-Based Structure**: UI elements are organized as reusable components
2. **Context-Based State Management**: Application state is managed via React Context API
3. **Direct Blockchain Interaction**: Frontend interacts directly with smart contracts via ethers.js
4. **Secure Authentication**: Firebase handles user authentication and profile management

### Architecture Diagram

```
+-----------------+     +-----------------+     +-----------------+
|                 |     |                 |     |                 |
|  React Frontend |<--->| Firebase Auth   |     |  Express Backend|
|                 |     |                 |     |                 |
+-----------------+     +-----------------+     +-----------------+
        ^                                               ^
        |                                               |
        v                                               v
+-----------------+     +-----------------+     +-----------------+
|                 |     |                 |     |                 |
|  ethers.js      |<--->| Ethereum        |<--->| SQLite Database |
|                 |     | Blockchain      |     |                 |
+-----------------+     +-----------------+     +-----------------+
```

## Project Structure

Our frontend follows a modular organization to maintain clean separation of concerns:

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # API services and blockchain integration
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── contracts/        # Smart contract ABIs
│   ├── config/           # Configuration files
│   ├── lib/              # Library integrations
│   ├── styles/           # Global styles and theme
│   ├── App.tsx           # Main application component
│   └── index.tsx         # Application entry point
├── public/               # Static assets
├── node_modules/         # Dependencies
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Setup and Installation

### Prerequisites

- Node.js v16+ and npm v8+
- Git for version control
- A text editor (VS Code recommended)
- Local Hardhat node running (for blockchain interaction)

### Installation Steps

1. **Clone the repository and navigate to the client folder**

```bash
git clone <repository-url>
cd blockchain-rental-loan-system/client
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the client directory:

```
REACT_APP_API_URL=http://localhost:5000
```

4. **Configure Firebase**

Update the Firebase configuration in `src/config/firebase.ts` with your Firebase project details:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

5. **Update contract addresses**

Modify `src/contexts/ContractContext.tsx` to use the correct smart contract addresses:

```typescript
const CONTRACT_ADDRESSES = {
  RENTAL_FACTORY: process.env.REACT_APP_RENTAL_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  LOAN_FACTORY: process.env.REACT_APP_LOAN_FACTORY_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
};
```

6. **Start the development server**

```bash
npm start
```

## Core Technologies

### React and TypeScript

We use React 18 with TypeScript for type-safe component development. TypeScript provides several advantages:

- Static type checking
- Better IDE support with autocompletion
- Self-documenting code
- Easier refactoring

### UI Framework

- **TailwindCSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Component Composition**: Building complex UIs from simpler components

### Blockchain Interaction

- **ethers.js v6.7.0**: Library for interacting with the Ethereum blockchain
- **Smart Contract ABIs**: JSON interface descriptions stored in `src/contracts/ABI/`
- **Contract Context**: React context for managing contract instances

## Authentication System

Our application uses Firebase Authentication for user management and security.

### Authentication Flow

1. **User Registration**:
   - User creates account with email and password
   - Firebase creates new user account
   - Backend assigns a blockchain wallet address to the user
   - User profile data is stored in the backend database

2. **User Login**:
   - User provides credentials
   - Firebase validates credentials and returns a JWT token
   - Token is stored in memory (not localStorage for security)
   - User wallet is automatically connected

```typescript
// Pseudocode for authentication flow
async function registerUser(email, password) {
  // 1. Create Firebase user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // 2. Get ID token
  const idToken = await userCredential.user.getIdToken();
  
  // 3. Register user in backend (which assigns wallet)
  await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ email })
  });
  
  // 4. Connect wallet
  await connectWallet();
}
```

### AuthContext

The `AuthContext` provides authentication state and methods throughout the application:

- `currentUser`: Currently logged-in Firebase user object
- `login()`: Login method
- `signup()`: User registration method
- `logout()`: Logout method
- `loading`: Authentication loading state

## Blockchain Integration

### WalletContext

The `WalletContext` manages blockchain wallet connections and provides:

- `provider`: ethers.js provider instance
- `signer`: ethers.js signer instance
- `walletAddress`: Connected wallet address
- `walletBalance`: Current wallet balance
- `isConnected`: Connection status
- `connectWallet()`: Method to connect to blockchain
- `disconnectWallet()`: Method to disconnect from blockchain

### Wallet Connection Flow

```
+------------------+     +-------------------+     +-------------------+
| User logs in     |---->| Get user profile  |---->| Get wallet address|
+------------------+     | from backend      |     | from profile      |
                         +-------------------+     +-------------------+
                                                           |
                                                           v
+------------------+     +-------------------+     +-------------------+
| Wallet connected |<----| Connect to wallet |<----| Get signer for    |
| and ready to use |     | using ethers.js   |     | wallet address    |
+------------------+     +-------------------+     +-------------------+
```

### ContractContext

The `ContractContext` manages smart contract instances and interactions:

- `rentalFactory`: Contract instance for RentalAgreementFactory
- `loanFactory`: Contract instance for LoanAgreementFactory
- `getRentalContract()`: Method to get a RentalAgreement contract
- `getLoanContract()`: Method to get a LoanAgreement contract
- `createRentalAgreement()`: Method to create a new rental agreement
- `createLoanAgreement()`: Method to create a new loan agreement

```typescript
// Pseudocode for contract interaction
async function createNewRentalAgreement(tenant, duration, deposit, rent, grace, name) {
  if (!rentalFactory || !signer) return null;
  
  try {
    // Convert string values to Wei (blockchain format)
    const depositWei = ethers.parseEther(deposit);
    const rentWei = ethers.parseEther(rent);
    
    // Call the smart contract function
    const tx = await rentalFactory.createAgreement(
      tenant,
      LOAN_FACTORY_ADDRESS,
      duration,
      depositWei,
      rentWei,
      grace,
      name
    );
    
    // Wait for transaction to complete
    const receipt = await tx.wait();
    
    // Return data
    return { contractAddress, transactionHash: tx.hash };
  } catch (error) {
    console.error('Error creating rental agreement:', error);
    throw new Error('Failed to create rental agreement');
  }
}
```

## State Management with Context API

We use React's Context API for state management instead of Redux or other state management libraries. This approach provides:

- Simpler integration with React's component lifecycle
- Reduced boilerplate code
- Easier testing
- More natural composition with TypeScript

### Key Contexts

1. **AuthContext**: User authentication and profile
2. **WalletContext**: Blockchain wallet connection
3. **ContractContext**: Smart contract instances and interactions
4. **ToastContext**: Notification management

### Context Composition

Contexts are composed in `App.tsx` to ensure proper dependency order:

```jsx
<AuthProvider>
  <WalletProvider>
    <WalletContextInitializer>
      <ContractProvider>
        <Routes>
          {/* Application routes */}
        </Routes>
      </ContractProvider>
    </WalletContextInitializer>
  </WalletProvider>
</AuthProvider>
```

## Component Library

We use a combination of custom components and shadcn/ui components built on Radix UI primitives.

### Key Components

- **Layout**: Page layout structure with navigation
- **UI Components**: Buttons, inputs, cards, etc.
- **Form Components**: Form elements with validation
- **Blockchain Components**: Components for displaying blockchain data

### Component Design Principles

1. **Composition over inheritance**: Build complex components from simpler ones
2. **Prop types with TypeScript**: Clear interface definitions
3. **Separation of concerns**: UI logic separate from business logic
4. **Responsive design**: Mobile-first approach

## Routing

We use React Router v6 for application routing.

### Route Structure

```jsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  
  {/* Protected routes */}
  <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="profile" element={<ProfilePage />} />
    
    {/* Rental routes */}
    <Route path="rental">
      <Route index element={<RentalList />} />
      <Route path="create" element={<RentalCreate />} />
      <Route path=":address" element={<RentalDetail />} />
      <Route path=":address/loan/request/create" element={<RequestCreate />} />
      <Route path=":address/loan/request/:id" element={<RequestDetail />} />
    </Route>
    
    {/* Loan routes */}
    <Route path="loan" element={<Loan />}>
      <Route index element={<Navigate to="/loan/agreements" replace />} />
      <Route path="agreements" element={<AgreementList />} />
      <Route path="agreement/:address" element={<AgreementDetail />} />
      <Route path="requests" element={<RequestList />} />
      <Route path="myrequests" element={<MyRequestsPage />} />
      <Route path="myoffers" element={<MyOffersPage />} />
      <Route path="request/create" element={<RequestCreate />} />
    </Route>
  </Route>
  
  {/* 404 Not found */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Protected Routes

We implement protected routes to prevent unauthorized access:

```typescript
const PrivateRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};
```

## Key Features Implementation

### Rental Agreement Creation

The rental agreement creation process follows these steps:

1. User fills rental agreement form
2. Form data is validated
3. Smart contract call is prepared with ethers.js
4. Transaction is sent to the blockchain
5. User is redirected to the agreement detail page upon success

### Loan Request and Offer Flow

```
+----------------+      +----------------+      +----------------+
| Renter creates |----->| Lender browses |----->| Lender creates |
| loan request   |      | loan requests  |      | loan offer     |
+----------------+      +----------------+      +----------------+
        |                                               |
        v                                               v
+----------------+      +----------------+      +----------------+
| Renter views   |----->| Renter accepts |----->| Smart contract |
| loan offers    |      | loan offer     |      | deployed       |
+----------------+      +----------------+      +----------------+
```

### Payment Processing

1. User initiates payment (rent or loan repayment)
2. Payment amount is validated against contract requirements
3. Transaction is prepared and signed
4. Blockchain transaction is submitted
5. Transaction receipt is monitored for success
6. Backend is notified of successful payment
7. UI is updated to reflect payment status

## Development Workflow

### Local Development

1. **Start the local environment**

```bash
npm start
```

This will start the React development server at http://localhost:3000

2. **Connect to backend and blockchain**

Ensure the backend server is running at http://localhost:5000 and the Hardhat node is running at http://127.0.0.1:8545

3. **Development process**

- Create and modify components in the `src/components` directory
- Create new pages in the `src/pages` directory
- Add routes in `App.tsx`
- Add API services in the `src/services` directory

### Best Practices

1. **Component Structure**
   - One component per file
   - Use function components with hooks
   - Keep components small and focused

2. **State Management**
   - Use context for global state
   - Use useState for local component state
   - Use useReducer for complex state logic

3. **Performance Optimization**
   - Use React.memo for pure components
   - Use useMemo for expensive calculations
   - Use useCallback for function references

4. **Error Handling**
   - Implement error boundaries
   - Use try/catch for async operations
   - Display user-friendly error messages

## Deployment

### Build Process

1. **Create production build**

```bash
npm run build
```

This generates optimized production files in the `build` directory.

2. **Environment configuration**

Update environment variables for production in `.env.production` file:

```
REACT_APP_API_URL=https://api.yourdomain.com
```

3. **Deployment options**

- Static hosting (Netlify, Vercel, GitHub Pages)
- Containerized deployment (Docker)
- Traditional web hosting

## Troubleshooting

### Common Issues

1. **Wallet Connection Problems**
   - Ensure Hardhat node is running
   - Check if wallet address is properly assigned in the backend
   - Verify network configuration matches Hardhat node

2. **Smart Contract Interaction Failures**
   - Verify contract addresses are correct
   - Ensure contract ABIs match deployed contracts
   - Check for sufficient gas and ETH balance

3. **Authentication Issues**
   - Verify Firebase configuration
   - Check if tokens are being properly refreshed
   - Ensure backend can validate Firebase tokens

### Debugging Tools

- React Developer Tools browser extension
- ethers.js debugging helpers in the console
- Network request monitoring in browser devtools

---

This documentation provides a comprehensive overview of the frontend architecture, implementation details, and development workflow for our Blockchain-Based Rental Loan System. For specific implementation details, refer to the codebase and comments within the source files.
