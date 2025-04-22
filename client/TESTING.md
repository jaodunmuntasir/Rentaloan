# Testing Guide

This document outlines how to run tests for different components of the application.

## Running All Tests

To run all tests in the project, use one of the following methods:

### Using npm:

```bash
npm run test:all
```

### Using the batch file (Windows):

```bash
.\run-all-tests.bat
```

### Using node directly:

```bash
node scripts/run-all-tests.js
```

## Running Specific Tests

### Running specific types of tests:

Different types of tests require different commands:

```bash
# Run service tests
npx jest src/services/__tests__/[file-name].test.ts

# Run context tests
npx jest src/contexts/__tests__/[file-name].test.tsx

# Run page component tests
npx react-scripts test src/pages/__tests__/[file-name].test.tsx

# Run UI component tests
npx react-scripts test src/components/[component-path]/__tests__/[file-name].test.tsx
```

### Examples:

```bash
# Service test example
npx jest src/services/__tests__/simple.test.ts

# Context test example
npx jest src/contexts/__tests__/AuthContext.test.tsx

# Page component test example
npx react-scripts test src/pages/__tests__/Login.test.tsx

# UI component test example
npx react-scripts test src/components/dashboard/__tests__/WalletInfo.test.tsx
```

### Running tests for a specific type of component:

```bash
# Run all service tests
npx jest src/services/__tests__

# Run all context tests
npx jest src/contexts/__tests__

# Run all page component tests
npx react-scripts test src/pages

# Run all UI component tests
npx react-scripts test src/components
```

## Test Files

The project includes tests for various components:

### Service Tests
- `src/services/__tests__/blockchain.service.test.ts`
- `src/services/__tests__/simple.test.ts`
- `src/services/__tests__/api.service.test.ts`
- `src/services/__tests__/loan-agreement.service.test.ts`
- `src/services/__tests__/status-tracking.service.test.ts`

### Context Tests
- `src/contexts/__tests__/AuthContext.test.tsx`
- `src/contexts/__tests__/WalletContext.test.tsx`
- `src/contexts/__tests__/ContractContext.test.tsx`

### Page Component Tests
- `src/pages/__tests__/Login.test.tsx`
- `src/pages/__tests__/Dashboard.test.tsx`
- `src/pages/rental/__tests__/Create.test.tsx`
- `src/pages/loan/__tests__/RequestCreate.test.tsx`

### UI Component Tests
- `src/components/dashboard/__tests__/WalletInfo.test.tsx` 