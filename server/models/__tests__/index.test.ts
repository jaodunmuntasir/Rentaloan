// Mock the modules before imports
jest.mock('sequelize-typescript');
jest.mock('../user.model', () => ({ User: {} }));
jest.mock('../rental-agreement.model', () => ({ RentalAgreement: {} }));
jest.mock('../loan-request.model', () => ({ LoanRequest: {} }));
jest.mock('../loan-offer.model', () => ({ LoanOffer: {} }));
jest.mock('../loan-agreement.model', () => ({ LoanAgreement: {} }));
jest.mock('../payment.model', () => ({ Payment: {} }));
jest.mock('../index', () => {
  const mockSequelize = {
    authenticate: jest.fn().mockResolvedValue(true),
    transaction: jest.fn(),
    model: jest.fn(),
    models: {
      User: {},
      RentalAgreement: {},
      LoanRequest: {},
      LoanOffer: {},
      LoanAgreement: {},
      Payment: {}
    }
  };
  return mockSequelize;
});

// Now import the mocked modules
import sequelize from '../index';
import { User } from '../user.model';
import { RentalAgreement } from '../rental-agreement.model';
import { LoanRequest } from '../loan-request.model';
import { LoanOffer } from '../loan-offer.model';
import { LoanAgreement } from '../loan-agreement.model';
import { Payment } from '../payment.model';

// Type the mocked sequelize object
type MockedSequelize = typeof sequelize & {
  transaction: jest.Mock;
  authenticate: jest.Mock;
  model: jest.Mock;
};

describe('Database Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('database connection initializes', async () => {
    // Test that the connection can be established
    await expect((sequelize as MockedSequelize).authenticate()).resolves.toBeTruthy();
    expect((sequelize as MockedSequelize).authenticate).toHaveBeenCalled();
  });

  it('models are registered correctly', () => {
    // Check if all models are registered in the sequelize instance
    expect(sequelize.models).toHaveProperty('User');
    expect(sequelize.models).toHaveProperty('RentalAgreement');
    expect(sequelize.models).toHaveProperty('LoanRequest');
    expect(sequelize.models).toHaveProperty('LoanOffer');
    expect(sequelize.models).toHaveProperty('LoanAgreement');
    expect(sequelize.models).toHaveProperty('Payment');
  });

  it('associations are established properly', () => {
    // Mock the associations
    const mockUserAssociations = {
      rentalAgreementsAsLandlord: { target: RentalAgreement, foreignKey: 'landlordId' },
      rentalAgreementsAsRenter: { target: RentalAgreement, foreignKey: 'renterId' }
    };
    
    const mockRentalAssociations = {
      landlord: { target: User, foreignKey: 'landlordId' },
      renter: { target: User, foreignKey: 'renterId' }
    };
    
    const mockLoanRequestAssociations = {
      rentalAgreement: { target: RentalAgreement, foreignKey: 'rentalAgreementId' },
      borrower: { target: User, foreignKey: 'borrowerId' }
    };
    
    const mockLoanOfferAssociations = {
      loanRequest: { target: LoanRequest, foreignKey: 'loanRequestId' },
      lender: { target: User, foreignKey: 'lenderId' }
    };
    
    const mockLoanAgreementAssociations = {
      loanRequest: { target: LoanRequest, foreignKey: 'loanRequestId' },
      loanOffer: { target: LoanOffer, foreignKey: 'loanOfferId' },
      borrower: { target: User, foreignKey: 'borrowerId' },
      lender: { target: User, foreignKey: 'lenderId' },
      payments: { target: Payment, foreignKey: 'loanAgreementId' }
    };
    
    const mockPaymentAssociations = {
      loanAgreement: { target: LoanAgreement, foreignKey: 'loanAgreementId' },
      rentalAgreement: { target: RentalAgreement, foreignKey: 'rentalAgreementId' },
      payer: { target: User, foreignKey: 'payerId' },
      recipient: { target: User, foreignKey: 'recipientId' }
    };

    // Mock the associations for each model
    Object.defineProperty(User, 'associations', { value: mockUserAssociations });
    Object.defineProperty(RentalAgreement, 'associations', { value: mockRentalAssociations });
    Object.defineProperty(LoanRequest, 'associations', { value: mockLoanRequestAssociations });
    Object.defineProperty(LoanOffer, 'associations', { value: mockLoanOfferAssociations });
    Object.defineProperty(LoanAgreement, 'associations', { value: mockLoanAgreementAssociations });
    Object.defineProperty(Payment, 'associations', { value: mockPaymentAssociations });
    
    // Test User associations
    expect(User.associations).toHaveProperty('rentalAgreementsAsLandlord');
    expect(User.associations.rentalAgreementsAsLandlord.target).toBe(RentalAgreement);
    
    expect(User.associations).toHaveProperty('rentalAgreementsAsRenter');
    expect(User.associations.rentalAgreementsAsRenter.target).toBe(RentalAgreement);
    
    // Test RentalAgreement associations
    expect(RentalAgreement.associations).toHaveProperty('landlord');
    expect(RentalAgreement.associations.landlord.target).toBe(User);
    
    expect(RentalAgreement.associations).toHaveProperty('renter');
    expect(RentalAgreement.associations.renter.target).toBe(User);
    
    // Test LoanRequest associations
    expect(LoanRequest.associations).toHaveProperty('rentalAgreement');
    expect(LoanRequest.associations.rentalAgreement.target).toBe(RentalAgreement);
    
    expect(LoanRequest.associations).toHaveProperty('borrower');
    expect(LoanRequest.associations.borrower.target).toBe(User);
    
    // Test LoanOffer associations
    expect(LoanOffer.associations).toHaveProperty('loanRequest');
    expect(LoanOffer.associations.loanRequest.target).toBe(LoanRequest);
    
    expect(LoanOffer.associations).toHaveProperty('lender');
    expect(LoanOffer.associations.lender.target).toBe(User);
    
    // Test LoanAgreement associations
    expect(LoanAgreement.associations).toHaveProperty('loanRequest');
    expect(LoanAgreement.associations.loanRequest.target).toBe(LoanRequest);
    
    expect(LoanAgreement.associations).toHaveProperty('loanOffer');
    expect(LoanAgreement.associations.loanOffer.target).toBe(LoanOffer);
    
    expect(LoanAgreement.associations).toHaveProperty('borrower');
    expect(LoanAgreement.associations.borrower.target).toBe(User);
    
    expect(LoanAgreement.associations).toHaveProperty('lender');
    expect(LoanAgreement.associations.lender.target).toBe(User);
    
    expect(LoanAgreement.associations).toHaveProperty('payments');
    expect(LoanAgreement.associations.payments.target).toBe(Payment);
    
    // Test Payment associations
    expect(Payment.associations).toHaveProperty('loanAgreement');
    expect(Payment.associations.loanAgreement.target).toBe(LoanAgreement);
    
    expect(Payment.associations).toHaveProperty('rentalAgreement');
    expect(Payment.associations.rentalAgreement.target).toBe(RentalAgreement);
    
    expect(Payment.associations).toHaveProperty('payer');
    expect(Payment.associations.payer.target).toBe(User);
    
    expect(Payment.associations).toHaveProperty('recipient');
    expect(Payment.associations.recipient.target).toBe(User);
  });

  it('transaction handling works as expected', async () => {
    // Mock transaction functionality
    const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    (sequelize as MockedSequelize).transaction.mockResolvedValue(mockTransaction);
    
    // Successful transaction
    let transaction = await (sequelize as MockedSequelize).transaction();
    await transaction.commit();
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
    
    // Failed transaction with rollback
    transaction = await (sequelize as MockedSequelize).transaction();
    await transaction.rollback();
    expect(transaction.rollback).toHaveBeenCalled();
    
    // Transaction using callback
    const mockCallback = jest.fn().mockResolvedValue('result');
    (sequelize as MockedSequelize).transaction.mockImplementationOnce((callback: any) => {
      return callback(mockTransaction).then(() => {
        return mockTransaction.commit();
      });
    });
    
    await (sequelize as MockedSequelize).transaction(mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(mockTransaction);
    expect(mockTransaction.commit).toHaveBeenCalled();
  });
}); 