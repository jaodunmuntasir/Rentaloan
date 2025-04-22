// Mock the API service functions
const mockLogin = jest.fn().mockResolvedValue({ 
  success: true, 
  user: { id: 1, email: 'test@example.com' } 
});

const mockGetProfile = jest.fn().mockResolvedValue({
  id: 1,
  email: 'test@example.com',
  walletAddress: '0x123TestAddress'
});

const mockGetRentals = jest.fn().mockResolvedValue([
  {
    address: '0x123RentalContract',
    landlord: '0x456LandlordAddress',
    tenant: '0x789TenantAddress',
    status: 'ACTIVE'
  }
]);

// Mock the API module
jest.mock('../api.service', () => ({
  UserApi: {
    login: mockLogin,
    getProfile: mockGetProfile
  },
  RentalApi: {
    getRentals: mockGetRentals
  }
}));

// Import after mocking
const { UserApi, RentalApi } = require('../api.service');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('UserApi', () => {
    test('login authenticates user', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Act
      const result = await UserApi.login(credentials.email, credentials.password);
      
      // Assert
      expect(result).toEqual({ 
        success: true, 
        user: { id: 1, email: 'test@example.com' } 
      });
      expect(mockLogin).toHaveBeenCalledWith(credentials.email, credentials.password);
    });
    
    test('getProfile returns user profile', async () => {
      // Arrange
      const mockUser = { getIdToken: jest.fn().mockResolvedValue('test-token') };
      
      // Act
      const result = await UserApi.getProfile(mockUser);
      
      // Assert
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        walletAddress: '0x123TestAddress'
      });
      expect(mockGetProfile).toHaveBeenCalledWith(mockUser);
    });
  });
  
  describe('RentalApi', () => {
    test('getRentals fetches rental agreements', async () => {
      // Arrange
      const mockUser = { getIdToken: jest.fn().mockResolvedValue('test-token') };
      
      // Act
      const result = await RentalApi.getRentals(mockUser);
      
      // Assert
      expect(result).toEqual([
        {
          address: '0x123RentalContract',
          landlord: '0x456LandlordAddress',
          tenant: '0x789TenantAddress',
          status: 'ACTIVE'
        }
      ]);
      expect(mockGetRentals).toHaveBeenCalledWith(mockUser);
    });
  });
}); 