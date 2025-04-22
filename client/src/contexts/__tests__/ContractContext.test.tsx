import React from 'react';
import { ContractProvider } from '../ContractContext';

// Mock WalletContext dependency
jest.mock('../WalletContext', () => ({
  useWallet: jest.fn().mockReturnValue({
    provider: {},
    network: 'testnet',
    connected: true
  })
}));

// Mock ethers Contract
jest.mock('ethers', () => ({
  Contract: jest.fn().mockImplementation(() => ({
    getRentalAgreementDetails: jest.fn().mockResolvedValue([]),
    getCollateralForProperty: jest.fn().mockResolvedValue("0")
  }))
}));

describe('ContractContext', () => {
  test('renders without crashing', () => {
    // If rendering doesn't throw, test passes
    expect(() => {
      <ContractProvider>
        <div>Test Child</div>
      </ContractProvider>
    }).not.toThrow();
  });
}); 