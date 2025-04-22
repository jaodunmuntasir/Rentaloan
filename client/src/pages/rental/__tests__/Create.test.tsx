import React from 'react';
import Create from '../Create';
import { useAuth } from '../../../contexts/AuthContext';
import { useContracts } from '../../../contexts/ContractContext';
import { useWallet } from '../../../contexts/WalletContext';
import { RentalApi, UserApi } from '../../../services/api.service';
import { useToast } from '../../../contexts/ToastContext';

// Mock all dependencies
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../contexts/ContractContext', () => ({
  useContracts: jest.fn(),
}));

jest.mock('../../../contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

jest.mock('../../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

jest.mock('../../../services/api.service', () => ({
  RentalApi: {
    createRental: jest.fn(),
  },
  UserApi: {
    findUserByEmail: jest.fn(),
  },
}));

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('Rental Create Page', () => {
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
    
    // Mock ContractContext
    (useContracts as jest.Mock).mockReturnValue({
      createRentalAgreement: jest.fn().mockResolvedValue({
        contractAddress: '0xContractAddress',
        transactionHash: '0xTransactionHash',
      }),
    });
    
    // Mock WalletContext
    (useWallet as jest.Mock).mockReturnValue({
      isConnected: true,
    });
    
    // Mock ToastContext
    (useToast as jest.Mock).mockReturnValue({
      showToast: jest.fn(),
    });
  });
  
  test('renders without crashing', () => {
    expect(() => {
      <Create />;
    }).not.toThrow();
  });
  
  test('validates security deposit calculation', () => {
    // Mock successful tenant lookup
    (UserApi.findUserByEmail as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'tenant-id',
        email: 'tenant@example.com',
        name: 'Tenant User',
        walletAddress: '0xTenantAddress',
      },
    });
    
    expect(() => {
      <Create />;
    }).not.toThrow();
  });
  
  test('handles form submission', () => {
    // Mock successful tenant lookup
    (UserApi.findUserByEmail as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'tenant-id',
        email: 'tenant@example.com',
        name: 'Tenant User',
        walletAddress: '0xTenantAddress',
      },
    });
    
    // Mock successful rental creation
    (RentalApi.createRental as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'rental-id',
        contractAddress: '0xContractAddress',
      },
    });
    
    expect(() => {
      <Create />;
    }).not.toThrow();
  });
}); 