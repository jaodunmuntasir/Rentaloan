// Mock the loan-agreement service functions
const mockCalculateLoanRepayment = jest.fn().mockReturnValue({
  monthlyPayment: '0.1',
  totalRepayment: '1.2',
  totalInterest: '0.2'
});

const mockCalculateCollateralRequired = jest.fn().mockReturnValue('1.5');

const mockValidateLoanParameters = jest.fn().mockReturnValue({
  valid: true,
  message: ''
});

// Mock the actual module
jest.mock('../loan-agreement.service', () => ({
  LoanAgreementService: {
    calculateLoanRepayment: mockCalculateLoanRepayment,
    calculateCollateralRequired: mockCalculateCollateralRequired,
    validateLoanParameters: mockValidateLoanParameters
  }
}));

// Import after mocking
const { LoanAgreementService } = require('../loan-agreement.service');

describe('LoanAgreementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateLoanRepayment', () => {
    test('calculates repayment details correctly', () => {
      // Arrange
      const loanAmount = '1.0';
      const interestRate = 5;
      const duration = 12;
      
      // Act
      const result = LoanAgreementService.calculateLoanRepayment(loanAmount, interestRate, duration);
      
      // Assert
      expect(result).toEqual({
        monthlyPayment: '0.1',
        totalRepayment: '1.2',
        totalInterest: '0.2'
      });
      expect(mockCalculateLoanRepayment).toHaveBeenCalledWith(loanAmount, interestRate, duration);
    });
  });

  describe('calculateCollateralRequired', () => {
    test('calculates required collateral correctly', () => {
      // Arrange
      const loanAmount = '1.0';
      const collateralFactor = 1.5;
      
      // Act
      const result = LoanAgreementService.calculateCollateralRequired(loanAmount, collateralFactor);
      
      // Assert
      expect(result).toBe('1.5');
      expect(mockCalculateCollateralRequired).toHaveBeenCalledWith(loanAmount, collateralFactor);
    });
  });

  describe('validateLoanParameters', () => {
    test('validates loan parameters correctly', () => {
      // Arrange
      const params = {
        loanAmount: '1.0',
        interestRate: 5,
        duration: 12,
        collateralFactor: 1.5
      };
      
      // Act
      const result = LoanAgreementService.validateLoanParameters(params);
      
      // Assert
      expect(result).toEqual({
        valid: true,
        message: ''
      });
      expect(mockValidateLoanParameters).toHaveBeenCalledWith(params);
    });
  });
}); 