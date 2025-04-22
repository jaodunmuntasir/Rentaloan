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
    // Mock contract methods as needed
  })),
  formatEther: jest.fn().mockImplementation((value) => '1.0'),
  parseEther: jest.fn().mockImplementation((value) => BigInt('1000000000000000000'))
})); 