# Backend Unit Testing Checklist

## Setup

1. **Testing Framework Setup**
   - [ ] Install Jest: `npm install --save-dev jest @types/jest ts-jest`
   - [ ] Install SuperTest: `npm install --save-dev supertest @types/supertest`
   - [ ] Install Testing Libraries: `npm install --save-dev sinon sequelize-mock`
   - [ ] Configure Jest in `package.json` or dedicated `jest.config.js`:
     ```js
     {
       "jest": {
         "preset": "ts-jest",
         "testEnvironment": "node",
         "testMatch": ["**/__tests__/**/*.test.ts"],
         "collectCoverageFrom": [
           "**/*.{ts,js}",
           "!**/node_modules/**",
           "!**/dist/**"
         ]
       }
     }
     ```
   - [ ] Create `jest.setup.js` for global test setup

2. **Mock Setup**
   - [ ] Create a test database configuration file
   - [ ] Set up test environment variables
   - [ ] Create Firebase mock for authentication
   - [ ] Configure Sequelize mocks
   - [ ] Create test utilities in `tests/utils.ts`

## Tests to Implement

### Route Handlers

1. **`routes/__tests__/auth.test.ts`**
   - [ ] `test('POST /api/auth/register creates new user')`
   - [ ] `test('POST /api/auth/register assigns wallet address')`
   - [ ] `test('POST /api/auth/register returns 409 for existing user')`
   - [ ] `test('GET /api/auth/profile returns user profile when authenticated')`
   - [ ] `test('GET /api/auth/profile returns 401 when not authenticated')`
   - [ ] `test('PUT /api/auth/profile updates user information')`
   - [ ] `test('PUT /api/auth/profile validates email uniqueness')`

2. **`routes/__tests__/user.test.ts`**
   - [ ] `test('GET /api/user/profile fetches user data')`
   - [ ] `test('PUT /api/user/profile updates user fields')`
   - [ ] `test('PUT /api/user/wallet updates wallet address')`
   - [ ] `test('GET /api/user/dashboard returns dashboard data')`
   - [ ] `test('authentication middleware blocks unauthorized access')`

3. **`routes/rental/__tests__/index.test.ts`**
   - [ ] `test('POST /api/rental creates new rental agreement')`
   - [ ] `test('GET /api/rental returns rental list')`
   - [ ] `test('GET /api/rental/:address returns rental details')`
   - [ ] `test('PUT /api/rental/:address updates rental properties')`
   - [ ] `test('validates required fields in rental creation')`

4. **`routes/loan/__tests__/index.test.ts`**
   - [ ] `test('POST /api/loan/request creates loan request')`
   - [ ] `test('GET /api/loan/requests returns loan request list')`
   - [ ] `test('GET /api/loan/request/:id returns request details')`
   - [ ] `test('POST /api/loan/fund creates loan agreement')`
   - [ ] `test('GET /api/loan/agreements returns loan agreement list')`
   - [ ] `test('validates loan parameters on creation')`

### Models

7. **`models/__tests__/user.model.test.ts`**
   - [ ] `test('User model validates email format')`
   - [ ] `test('User model validates required fields')`
   - [ ] `test('User model has correct associations')`
   - [ ] `test('User model encrypts sensitive data')`

8. **`models/__tests__/rental.model.test.ts`**
   - [ ] `test('Rental model validates address format')`
   - [ ] `test('Rental model calculates duration correctly')`
   - [ ] `test('Rental model handles relationship with loan agreements')`

9. **`models/__tests__/loan.model.test.ts`**
   - [ ] `test('Loan model validates amount fields')`
   - [ ] `test('Loan model validates relationship with rental')`
   - [ ] `test('Loan model calculates interest correctly')`
   - [ ] `test('Loan model tracks status transitions')`

### Database Interactions

10. **`models/__tests__/index.test.ts`**
    - [ ] `test('database connection initializes')`
    - [ ] `test('models are registered correctly')`
    - [ ] `test('associations are established properly')`
    - [ ] `test('transaction handling works as expected')`

## Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- routes/__tests__/auth.test.ts

# Run tests in watch mode during development
npm test -- --watch
```

## Test Patterns

### Route Handler Test Pattern
```typescript
import request from 'supertest';
import app from '../../app';
import { User } from '../../models/user.model';
import * as admin from '../../config/firebase';

// Mock Firebase and database
jest.mock('../../config/firebase');
jest.mock('../../models/user.model');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('creates new user', async () => {
      // Arrange
      const mockFirebaseUser = { uid: 'test-uid', email: 'test@example.com' };
      (admin.auth().createUser as jest.Mock).mockResolvedValue(mockFirebaseUser);
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        id: 1,
        firebaseId: 'test-uid',
        email: 'test@example.com',
        walletAddress: '0x123'
      });

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(admin.auth().createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

### Service Test Pattern
```typescript
import { WalletService } from '../wallet.service';
import { ethers } from 'ethers';
import { User } from '../../models/user.model';

// Mock dependencies
jest.mock('ethers');
jest.mock('../../models/user.model');

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableWallet', () => {
    test('finds unused wallet', async () => {
      // Arrange
      const mockAccounts = [
        { address: '0x123' },
        { address: '0x456' }
      ];
      (ethers.JsonRpcProvider.prototype.listAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (User.findAll as jest.Mock).mockResolvedValue([
        { walletAddress: '0x123' }
      ]);

      // Act
      const result = await WalletService.getAvailableWallet();

      // Assert
      expect(result).toBe('0x456');
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://localhost:8545');
    });
  });
});
```

### Model Test Pattern
```typescript
import { User } from '../user.model';
import { sequelize } from '../index';

// Use in-memory SQLite for tests
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('User Model', () => {
  test('validates email format', async () => {
    // Arrange
    const invalidUser = {
      firebaseId: 'test-uid',
      email: 'invalid-email',
      walletAddress: '0x123'
    };

    // Act & Assert
    await expect(User.create(invalidUser)).rejects.toThrow();
  });

  test('creates user with valid data', async () => {
    // Arrange
    const validUser = {
      firebaseId: 'test-uid',
      email: 'test@example.com',
      walletAddress: '0x123'
    };

    // Act
    const user = await User.create(validUser);

    // Assert
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
``` 