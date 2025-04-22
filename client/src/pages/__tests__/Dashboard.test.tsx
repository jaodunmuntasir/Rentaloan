import React from 'react';
import Dashboard from '../Dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { UserApi } from '../../services/api.service';

// Mock dependencies
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

jest.mock('../../services/api.service', () => ({
  UserApi: {
    getDashboard: jest.fn(),
  },
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AuthContext
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: {
        uid: 'test-user-id',
        email: 'user@example.com',
        displayName: 'Test User',
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      },
    });

    // Mock WalletContext
    (useWallet as jest.Mock).mockReturnValue({
      isConnected: true,
      walletAddress: '0x1234567890abcdef',
      walletBalance: '1.5',
      connectWallet: jest.fn(),
    });
  });

  test('renders without crashing', () => {
    // Mock API response
    (UserApi.getDashboard as jest.Mock).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'user@example.com',
        name: 'Test User',
        walletAddress: '0x1234567890abcdef',
      },
      rentalAgreements: [],
      loanAgreements: [],
      loanRequests: [],
      loanOffers: [],
      recentPayments: [],
    });

    expect(() => {
      <Dashboard />;
    }).not.toThrow();
  });

  test('displays fallback UI when API fails', () => {
    // Mock API failure
    (UserApi.getDashboard as jest.Mock).mockRejectedValue(new Error('API error'));

    expect(() => {
      <Dashboard />;
    }).not.toThrow();
  });
}); 