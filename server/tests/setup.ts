import mockSequelize from './mocks/sequelize.mock';
import mockFirebaseAdmin from './mocks/firebase.mock';

// Increase test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Mock Firebase admin
jest.mock('../config/firebase', () => mockFirebaseAdmin);

// Mock Sequelize
jest.mock('../models', () => mockSequelize);

// Mock ethers for blockchain interactions
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    listAccounts: jest.fn().mockResolvedValue([
      { address: '0x123TestWalletAddress' },
      { address: '0x456UnusedWalletAddress' }
    ]),
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
    getBlockNumber: jest.fn().mockResolvedValue(12345)
  })),
  Contract: jest.fn().mockImplementation(() => ({
    // Rental methods
    getContractDetails: jest.fn().mockResolvedValue([
      '0xLandlordAddress',
      '0xRenterAddress',
      12, // duration
      BigInt('2000000000000000000'), // security deposit
      BigInt('500000000000000000'), // base rent
      1, // status
      Math.floor(Date.now() / 1000), // startTime
      1 // gracePeriod
    ]),
    // Loan methods
    getBorrower: jest.fn().mockResolvedValue('0xBorrowerAddress'),
    getLender: jest.fn().mockResolvedValue('0xLenderAddress'),
    getLoanAmount: jest.fn().mockResolvedValue(BigInt('10000000000000000000')),
    getCollateralAmount: jest.fn().mockResolvedValue(BigInt('2000000000000000000')),
    getStatus: jest.fn().mockResolvedValue(1),
    calculateMonthlyPayment: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
    lastPaidMonth: jest.fn().mockResolvedValue(BigInt(2)),
    duration: jest.fn().mockResolvedValue(BigInt(12)),
    graceMonths: jest.fn().mockResolvedValue(BigInt(1)),
    interestRate: jest.fn().mockResolvedValue(BigInt(500)),
    getRepaymentSchedule: jest.fn().mockResolvedValue([
      [BigInt('1000000000000000000'), BigInt('1000000000000000000'), BigInt('1000000000000000000')],
      [BigInt(1), BigInt(2), BigInt(3)]
    ]),
    repaymentMade: jest.fn().mockImplementation((month) => Promise.resolve(Number(month) <= 2))
  })),
  formatEther: jest.fn().mockImplementation((value) => '1.0'),
  parseEther: jest.fn().mockImplementation((value) => BigInt('1000000000000000000'))
}));

// Mock blockchain service
jest.mock('../services/blockchain.service', () => ({
  getRentalAgreementContract: jest.fn().mockImplementation(() => ({
    getContractDetails: jest.fn().mockResolvedValue([
      '0xLandlordAddress',
      '0xRenterAddress',
      12, // duration
      BigInt('2000000000000000000'), // security deposit
      BigInt('500000000000000000'), // base rent
      1, // status
      Math.floor(Date.now() / 1000), // startTime
      1 // gracePeriod
    ])
  })),
  getLoanAgreementContract: jest.fn().mockImplementation(() => ({
    getBorrower: jest.fn().mockResolvedValue('0xBorrowerAddress'),
    getLender: jest.fn().mockResolvedValue('0xLenderAddress'),
    getLoanAmount: jest.fn().mockResolvedValue(BigInt('10000000000000000000')),
    getCollateralAmount: jest.fn().mockResolvedValue(BigInt('2000000000000000000')),
    getStatus: jest.fn().mockResolvedValue(1),
    calculateMonthlyPayment: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
    lastPaidMonth: jest.fn().mockResolvedValue(BigInt(2)),
    duration: jest.fn().mockResolvedValue(BigInt(12)),
    graceMonths: jest.fn().mockResolvedValue(BigInt(1)),
    interestRate: jest.fn().mockResolvedValue(BigInt(500)),
    getRepaymentSchedule: jest.fn().mockResolvedValue([
      [BigInt('1000000000000000000'), BigInt('1000000000000000000'), BigInt('1000000000000000000')],
      [BigInt(1), BigInt(2), BigInt(3)]
    ]),
    repaymentMade: jest.fn().mockImplementation((month) => Promise.resolve(Number(month) <= 2))
  })),
  getRentalAgreementDetails: jest.fn().mockResolvedValue({
    landlord: '0xLandlordAddress',
    renter: '0xRenterAddress',
    rentalDuration: 12,
    securityDeposit: '2.0',
    baseRent: '0.5',
    status: 1,
    startTime: new Date(),
    gracePeriod: 1
  }),
  getLoanAgreementDetails: jest.fn().mockResolvedValue({
    borrower: '0xBorrowerAddress',
    lender: '0xLenderAddress',
    loanAmount: '10.0',
    collateralAmount: '2.0',
    status: 1,
    monthlyPayment: '1.0',
    lastPaidMonth: 2,
    duration: 12,
    graceMonths: 1,
    interestRate: 500
  }),
  getRepaymentSchedule: jest.fn().mockResolvedValue([
    { month: 1, amount: '1.0', isPaid: true },
    { month: 2, amount: '1.0', isPaid: true },
    { month: 3, amount: '1.0', isPaid: false }
  ]),
  getAvailableCollateral: jest.fn().mockResolvedValue('2.0'),
  getLoanDetails: jest.fn().mockResolvedValue({
    contractAddress: '0xLoanContractAddress',
    borrower: '0xBorrowerAddress',
    lender: '0xLenderAddress',
    loanAmount: '10.0',
    collateralAmount: '2.0',
    status: 1,
    monthlyPayment: '1.0',
    schedule: [
      { month: 1, amount: '1.0', isPaid: true },
      { month: 2, amount: '1.0', isPaid: true },
      { month: 3, amount: '1.0', isPaid: false }
    ]
  }),
  verifyLoanInitialization: jest.fn().mockResolvedValue(true),
  verifyLoanRepayment: jest.fn().mockResolvedValue(true)
})); 