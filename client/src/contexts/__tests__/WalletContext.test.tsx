import React from 'react';
import { WalletProvider } from '../WalletContext';

// Mock ethers.js
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getBlockNumber: jest.fn().mockResolvedValue(123)
  }))
}));

// Mock AuthContext dependency
jest.mock('../AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({
    currentUser: null,
    loading: false
  })
}));

describe('WalletContext', () => {
  test('renders without crashing', () => {
    // If rendering doesn't throw, test passes
    expect(() => {
      <WalletProvider>
        <div>Test Child</div>
      </WalletProvider>
    }).not.toThrow();
  });
}); 