# Blockchain Scripts

This directory contains utility scripts for interacting with the blockchain contracts.

## Available Scripts

### 1. `deploy.ts`

Deploys contracts to the local Hardhat network and saves the addresses to a configuration file.

```bash
npx ts-node scripts/deploy.ts
```

### 2. `queryLoanContract.ts`

A development tool to query loan agreement contract details directly from the blockchain.

```bash
npx ts-node scripts/queryLoanContract.ts
```

## Loan Contract Query Tool

The `queryLoanContract.ts` script is a development utility that allows you to:

1. Connect to a local Hardhat node
2. Enter a loan agreement contract address
3. View comprehensive details about the loan contract, fetched directly from the blockchain

### Prerequisites

- Make sure your local Hardhat node is running:
  ```bash
  npx hardhat node
  ```

### How to Use

1. Run the script:
   ```bash
   npx ts-node scripts/queryLoanContract.ts
   ```

2. When prompted, enter the loan agreement contract address.

3. The script will display:
   - Basic contract details (status, parties involved)
   - Loan terms (amount, interest rate, duration, etc.)
   - Repayment status
   - Payment history
   - Repayment schedule

### Example Output

```
===== Loan Agreement Contract Query Tool =====

This tool allows you to query loan agreement contract details directly from the blockchain.
Connecting to local Hardhat node...
Connected with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Enter the loan agreement contract address: 0x123...abc

===== Loan Agreement Details =====

Contract Address:       0x123...abc
Status:                 ACTIVE

--- Parties ---
Borrower:               0xabc...123
Lender:                 0xdef...456
Rental Contract:        0x789...def

--- Loan Terms ---
Loan Amount:            1.5 ETH
Interest Rate:          5 %
Duration:               12 months
Grace Period:           1 months
Monthly Payment:        0.13 ETH
Collateral Amount:      0.5 ETH

--- Repayment Status ---
Last Paid Month:        3

--- Payment Details ---
Month | Paid
------------
1     | Yes
2     | Yes
3     | Yes
4     | No
...

--- Repayment Schedule ---
Month | Amount (ETH)
-------------------
1     | 0.13
2     | 0.13
...
12    | 0.13

===== End of Contract Details =====
```

### Notes

- This script is intended for development purposes only
- It only works with a local Hardhat node
- It uses the same contract ABI as the main application 