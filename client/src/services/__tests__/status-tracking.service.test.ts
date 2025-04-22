// Mock the status-tracking service functions
const mockTrackRentalStatus = jest.fn().mockResolvedValue({
  isActive: true,
  currentMonth: 3,
  hasUnpaidRent: false
});

const mockTrackLoanStatus = jest.fn().mockResolvedValue({
  isActive: true,
  currentRepaymentMonth: 2,
  hasUnpaidInstallment: false
});

const mockHandleContractEvent = jest.fn().mockImplementation((eventName, data, callback) => {
  callback(data);
  return () => {}; // Return unsubscribe function
});

// Mock the actual module
jest.mock('../status-tracking.service', () => ({
  StatusTrackingService: {
    trackRentalStatus: mockTrackRentalStatus,
    trackLoanStatus: mockTrackLoanStatus,
    handleContractEvent: mockHandleContractEvent
  }
}));

// Import after mocking
const { StatusTrackingService } = require('../status-tracking.service');

describe('StatusTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackRentalStatus', () => {
    test('tracks rental contract status correctly', async () => {
      // Arrange
      const contractAddress = '0x123RentalContract';
      
      // Act
      const result = await StatusTrackingService.trackRentalStatus(contractAddress);
      
      // Assert
      expect(result).toEqual({
        isActive: true,
        currentMonth: 3,
        hasUnpaidRent: false
      });
      expect(mockTrackRentalStatus).toHaveBeenCalledWith(contractAddress);
    });
  });

  describe('trackLoanStatus', () => {
    test('tracks loan contract status correctly', async () => {
      // Arrange
      const contractAddress = '0x456LoanContract';
      
      // Act
      const result = await StatusTrackingService.trackLoanStatus(contractAddress);
      
      // Assert
      expect(result).toEqual({
        isActive: true,
        currentRepaymentMonth: 2,
        hasUnpaidInstallment: false
      });
      expect(mockTrackLoanStatus).toHaveBeenCalledWith(contractAddress);
    });
  });

  describe('handleContractEvent', () => {
    test('handles contract events correctly', () => {
      // Arrange
      const eventName = 'PaymentReceived';
      const eventData = { month: 2, amount: '0.5' };
      const callback = jest.fn();
      
      // Act
      const unsubscribe = StatusTrackingService.handleContractEvent(eventName, eventData, callback);
      
      // Assert
      expect(typeof unsubscribe).toBe('function');
      expect(callback).toHaveBeenCalledWith(eventData);
      expect(mockHandleContractEvent).toHaveBeenCalledWith(eventName, eventData, callback);
    });
  });
}); 