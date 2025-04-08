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

### 3. `queryRentalContract.ts`

A development tool to query rental agreement contract details directly from the blockchain.

```bash
npx ts-node scripts/queryRentalContract.ts
```

## Contract Query Tools

### Loan Contract Query Tool

The `queryLoanContract.ts` script is a development utility that allows you to:

1. Connect to a local Hardhat node
2. Enter a loan agreement contract address
3. View comprehensive details about the loan contract, fetched directly from the blockchain

#### How to Use

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

### Rental Contract Query Tool

The `queryRentalContract.ts` script is a similar development utility for rental agreements that allows you to:

1. Connect to a local Hardhat node
2. Enter a rental agreement contract address
3. View comprehensive details about the rental contract, fetched directly from the blockchain

#### How to Use

1. Run the script:
   ```bash
   npx ts-node scripts/queryRentalContract.ts
   ```

2. When prompted, enter the rental agreement contract address.

3. The script will display:
   - Basic contract details (status, parties involved)
   - Rental terms (duration, rent amount, security deposit, etc.)
   - Payment status
   - Payment history showing paid and skipped months

### Prerequisites

- Make sure your local Hardhat node is running:
  ```bash
  npx hardhat node
  ```

### Example Output (Rental Contract)

```
===== Rental Agreement Contract Query Tool =====

This tool allows you to query rental agreement contract details directly from the blockchain.
Connecting to local Hardhat node...
Connected with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Enter the rental agreement contract address: 0xa16E02E87b7454126E5E10d957A927A7F5B5d2be

===== Rental Agreement Details =====

Contract Address:       0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
Status:                 ACTIVE

--- Parties ---
Landlord:               0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Renter:                 0x90F79bf6EB2c4f870365E785982E1f101E93b906
Loan Factory:           0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

--- Rental Terms ---
Start Time:             5/7/2025, 4:30:15 AM
Duration:               12 months
Base Rent:              0.5 ETH
Security Deposit:       1.0 ETH
Current Deposit:        1.0 ETH
Grace Period:           7 days

--- Payment Status ---
Last Paid Month:        3
Due Amount:             0.5 ETH
Skipped Months:         1

--- Payment History ---
Month | Paid | Skipped
---------------------
1     | Yes  | No
2     | Yes  | No
3     | Yes  | No
4     | No   | Yes
5     | No   | No
...
12    | No   | No

===== End of Contract Details =====
```

### Notes

- These scripts are intended for development purposes only
- They only work with a local Hardhat node
- They use the same contract ABIs as the main application 