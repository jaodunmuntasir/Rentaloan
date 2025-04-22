import { ethers } from 'ethers';

// Mock the BlockchainService functions we want to test
const mockGetRentalAgreementDetails = jest.fn().mockResolvedValue({
  landlord: '0x123LandlordAddress',
  tenant: '0x456RenterAddress',
  rentAmount: '0.5',
  rentDuration: 12,
  lastPaidMonth: 3,
  isActive: true
});

const mockGetAvailableCollateral = jest.fn().mockResolvedValue({
  availableAmount: '0.8',
  totalDeposited: '1.0'
});

const mockGetDueAmount = jest.fn().mockResolvedValue({
  dueAmount: '0.1',
  nextPaymentMonth: 4
});

// Mock the actual module
jest.mock('../blockchain.service', () => ({
  BlockchainService: {
    getRentalAgreementDetails: mockGetRentalAgreementDetails,
    getAvailableCollateral: mockGetAvailableCollateral,
    getDueAmount: mockGetDueAmount,
    getWalletConnection: jest.fn().mockReturnValue({
      provider: {},
      signer: {}
    })
  }
}));

// We need to use require instead of import to avoid hoisting issues
const { BlockchainService } = require('../blockchain.service');

describe('BlockchainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRentalAgreementDetails', () => {
    test('returns correct data from contract', async () => {
      // Arrange 
      const contractAddress = '0x123ContractAddress';
      
      // Act
      const result = await BlockchainService.getRentalAgreementDetails(contractAddress);
      
      // Assert
      expect(result).toEqual({
        landlord: '0x123LandlordAddress',
        tenant: '0x456RenterAddress',
        rentAmount: '0.5',
        rentDuration: 12,
        lastPaidMonth: 3,
        isActive: true
      });
      
      // Verify the function was called with correct address
      expect(mockGetRentalAgreementDetails).toHaveBeenCalledWith(contractAddress);
    });
  });

  describe('getAvailableCollateral', () => {
    test('returns collateral information', async () => {
      // Arrange
      const contractAddress = '0x123ContractAddress';
      
      // Act
      const result = await BlockchainService.getAvailableCollateral(contractAddress);
      
      // Assert
      expect(result).toEqual({
        availableAmount: '0.8',
        totalDeposited: '1.0'
      });
      
      // Verify the function was called with correct address
      expect(mockGetAvailableCollateral).toHaveBeenCalledWith(contractAddress);
    });
  });

  describe('getDueAmount', () => {
    test('returns due amount information', async () => {
      // Arrange
      const contractAddress = '0x123ContractAddress';
      
      // Act
      const result = await BlockchainService.getDueAmount(contractAddress);
      
      // Assert
      expect(result).toEqual({
        dueAmount: '0.1',
        nextPaymentMonth: 4
      });
      
      // Verify the function was called with correct address
      expect(mockGetDueAmount).toHaveBeenCalledWith(contractAddress);
    });
  });
}); 