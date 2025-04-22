# Testing Infrastructure

This document outlines the testing infrastructure for the server application.

## Test Structure

Tests are organized in `__tests__` directories for each major component:

- `models/__tests__`: Tests for database models
- `services/__tests__`: Tests for service layer
- `controllers/__tests__`: Tests for controller layer
- `routes/__tests__`: Tests for API routes
- `middleware/__tests__`: Tests for Express middleware
- `utils/__tests__`: Tests for utility functions

## Running Tests

### Running All Tests

To run all tests across the application:

```bash
npm run test:all
```

This command uses the custom test runner (`runAllTests.ts`) which will:
- Scan for test directories
- Run tests in each directory sequentially
- Provide a summary of test results with colorized output
- Exit with the appropriate status code (0 for success, 1 for failure)

### Running Specific Test Suites

To run tests for a specific module:

```bash
npm test -- models/__tests__
```

Or a specific test file:

```bash
npm test -- models/__tests__/user.model.test.ts
```

### Test Coverage

To generate test coverage reports:

```bash
npm run test:coverage
```

### Watch Mode

For development, you can run tests in watch mode:

```bash
npm run test:watch
```

## Writing Tests

### Model Tests

Model tests verify:
- Schema definitions (fields, types, constraints)
- Associations between models
- Instance methods
- Advanced calculations

Example:
```typescript
// Import the model
import { User } from '../user.model';

describe('User Model', () => {
  it('has required fields', () => {
    // Test implementation
  });
});
```

### Database Tests

Database tests verify:
- Connection initialization
- Model registration
- Association setup
- Transaction handling

These tests use mocks to avoid actual database connections.

## Mocking Strategy

- Model tests use jest.mock() to mock Sequelize models
- This avoids actual database connections during testing
- Associations and model methods are mocked using jest.fn()

## Test Configuration

Jest is configured in the `jest.config.js` file, with settings for:
- TypeScript support via ts-jest
- Coverage thresholds
- Module paths
- Test environment 