# Frontend Unit Testing Checklist

## Setup

1. **Testing Framework Setup**
   - [ ] Install Jest: `npm install --save-dev jest @types/jest ts-jest`
   - [ ] Install React Testing Library: `npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event`
   - [ ] Install Mock Service Worker: `npm install --save-dev msw`
   - [ ] Configure Jest in `package.json` or dedicated `jest.config.js`:
     ```js
     {
       "jest": {
         "preset": "ts-jest",
         "testEnvironment": "jsdom",
         "setupFilesAfterEnv": [
           "<rootDir>/src/setupTests.ts"
         ],
         "moduleNameMapper": {
           "\\.(css|less|scss|sass)$": "identity-obj-proxy"
         }
       }
     }
     ```
   - [ ] Setup test utils in `src/test-utils/test-utils.tsx` for custom render with providers

2. **Mock Setup**
   - [ ] Create `src/mocks/handlers.ts` for API mocking
   - [ ] Create `src/mocks/server.ts` for MSW setup
   - [ ] Create `src/mocks/blockchain.ts` for Ethers.js mocking
   - [ ] Configure mock setup in `src/setupTests.ts`

## Tests to Implement

### Services

1. **`src/services/__tests__/blockchain.service.test.ts`**
   - [ ] `test('getRentalAgreementDetails returns correct data')`
   - [ ] `test('getAvailableCollateral calculates correctly')`
   - [ ] `test('getDueAmount returns proper next payment info')`
   - [ ] `test('createLoanAgreement calls contract with correct parameters')`
   - [ ] `test('fundLoan transfers correct amount')`
   - [ ] `test('makeRepayment processes payment correctly')`
   - [ ] `test('withdrawCollateral transfers funds properly')`
   - [ ] `test('getLoanAgreementDetails fetches all required fields')`
   - [ ] `test('handles provider/signer not available errors')`
   - [ ] `test('handles contract error responses')`

2. **`src/services/__tests__/api.service.test.ts`**
   - [ ] `test('UserApi.login authenticates user correctly')`
   - [ ] `test('UserApi.register creates new user')`
   - [ ] `test('UserApi.getProfile fetches user data')`
   - [ ] `test('UserApi.updateProfile updates user information')`
   - [ ] `test('RentalApi.createRental forms proper request')`
   - [ ] `test('RentalApi.getRentals retrieves rental list')`
   - [ ] `test('LoanApi.createLoanRequest creates request with correct data')`
   - [ ] `test('LoanApi.getLoanRequests fetches loan requests')`
   - [ ] `test('attaches authentication token to requests')`
   - [ ] `test('handles API error responses')`
   - [ ] `test('retry logic works on network failures')`

3. **`src/services/__tests__/loan-agreement.service.test.ts`**
   - [ ] `test('calculateLoanRepayment works with different interest rates')`
   - [ ] `test('calculateCollateralRequired determines correct amounts')`
   - [ ] `test('validateLoanParameters rejects invalid inputs')`
   - [ ] `test('buildRepaymentSchedule creates correct monthly payments')`
   - [ ] `test('getLoanStatus handles all status transitions')`
   - [ ] `test('getMonthsInArrears calculates correctly')`

4. **`src/services/__tests__/status-tracking.service.test.ts`**
   - [ ] `test('trackRentalStatus monitors contract state')`
   - [ ] `test('trackLoanStatus detects payment changes')`
   - [ ] `test('notifyStatusChange triggers correct notifications')`
   - [ ] `test('handleContractEvent processes events correctly')`

### Context Providers

5. **`src/contexts/__tests__/AuthContext.test.tsx`**
   - [ ] `test('provides current user when authenticated')`
   - [ ] `test('login updates authentication state')`
   - [ ] `test('logout clears user state')`
   - [ ] `test('loading state works during authentication')`
   - [ ] `test('error handling works for failed logins')`

6. **`src/contexts/__tests__/WalletContext.test.tsx`**
   - [ ] `test('connectWallet updates connection state')`
   - [ ] `test('disconnectWallet clears wallet data')`
   - [ ] `test('updateWalletAddress changes address')`
   - [ ] `test('wallet balance updates periodically')`
   - [ ] `test('handles connection errors gracefully')`

7. **`src/contexts/__tests__/ContractContext.test.tsx`**
   - [ ] `test('initializes contract instances')`
   - [ ] `test('caches contract instances for reuse')`
   - [ ] `test('updates contract data on events')`
   - [ ] `test('handles contract initialization errors')`

### Utility Functions

8. **`src/utils/__tests__/dateUtils.test.ts`**
   - [ ] `test('formatTimestamp returns correct format')`
   - [ ] `test('calculateMonthsBetween works correctly')`
   - [ ] `test('getNextPaymentDate calculates correctly')`

9. **`src/utils/__tests__/formatUtils.test.ts`**
   - [ ] `test('formatCurrency shows correct currency format')`
   - [ ] `test('formatAddress shortens Ethereum addresses')`
   - [ ] `test('formatPercentage shows rates correctly')`

10. **`src/utils/__tests__/validationUtils.test.ts`**
    - [ ] `test('isValidEthAddress validates Ethereum addresses')`
    - [ ] `test('isValidAmount checks if amount is valid')`
    - [ ] `test('validateForm checks all required fields')`

### Page Components

11. **`src/pages/__tests__/Login.test.tsx`**
    - [ ] `test('renders login form correctly')`
    - [ ] `test('shows validation errors for empty fields')`
    - [ ] `test('submits form with valid data')`
    - [ ] `test('shows error message on failed login')`
    - [ ] `test('redirects after successful login')`

12. **`src/pages/__tests__/Dashboard.test.tsx`**
    - [ ] `test('renders user information correctly')`
    - [ ] `test('displays wallet information')`
    - [ ] `test('shows rental agreement summaries')`
    - [ ] `test('shows loan agreement summaries')`
    - [ ] `test('displays fallback UI when API fails')`

13. **`src/pages/rental/__tests__/Create.test.tsx`**
    - [ ] `test('validates all required fields')`
    - [ ] `test('calculates security deposit correctly')`
    - [ ] `test('creates rental agreement with valid data')`
    - [ ] `test('handles form submission errors')`

14. **`src/pages/loan/__tests__/RequestCreate.test.tsx`**
    - [ ] `test('calculates loan amounts correctly')`
    - [ ] `test('validates all loan parameters')`
    - [ ] `test('shows repayment schedule preview')`
    - [ ] `test('submits loan request with valid data')`
    - [ ] `test('handles errors during submission')`

### UI Components

15. **`src/components/dashboard/__tests__/WalletInfo.test.tsx`**
    - [ ] `test('displays wallet address correctly')`
    - [ ] `test('shows wallet balance in ETH')`
    - [ ] `test('handles connect wallet button click')`
    - [ ] `test('displays appropriate UI when not connected')`

16. **`src/components/forms/__tests__/LoanRequestForm.test.tsx`**
    - [ ] `test('updates values on input changes')`
    - [ ] `test('validates minimum and maximum values')`
    - [ ] `test('calculates repayment details on change')`
    - [ ] `test('submits form with valid data')`

## Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- src/services/__tests__/blockchain.service.test.ts

# Run tests in watch mode during development
npm test -- --watch
```

## Test Patterns

### Service Test Pattern
```typescript
import { BlockchainService } from '../blockchain.service';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers');

describe('BlockchainService', () => {
  beforeEach(() => {
    // Setup mocks
  });

  test('getRentalAgreementDetails returns correct data', async () => {
    // Arrange
    // Mock the contract and provider responses
    
    // Act
    const result = await BlockchainService.getRentalAgreementDetails('0x123');
    
    // Assert
    expect(result).toEqual({
      // Expected object shape with values
    });
  });
});
```

### Context Test Pattern
```typescript
import { render, screen, act } from '@testing-library/react';
import { WalletProvider, useWallet } from '../WalletContext';
import userEvent from '@testing-library/user-event';

// Test component that uses the context
const TestComponent = () => {
  const { isConnected, connectWallet } = useWallet();
  return (
    <div>
      <span data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</span>
      <button onClick={connectWallet}>Connect</button>
    </div>
  );
};

describe('WalletContext', () => {
  test('connectWallet updates connection state', async () => {
    // Arrange
    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );
    
    // Act
    await userEvent.click(screen.getByText('Connect'));
    
    // Assert
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
  });
});
``` 