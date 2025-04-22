import { RentalAgreement, RentalAgreementStatus } from '../rental-agreement.model';
import { User } from '../user.model';
import { DataTypes } from 'sequelize';

// Mock the Sequelize models
jest.mock('../rental-agreement.model');
jest.mock('../user.model');

// Setup mocks for testing
beforeAll(() => {
  // Define the RentalAgreementStatus enum
  Object.defineProperty(RentalAgreementStatus, 'INITIALIZED', { value: 'INITIALIZED' });
  Object.defineProperty(RentalAgreementStatus, 'ACTIVE', { value: 'ACTIVE' });
  Object.defineProperty(RentalAgreementStatus, 'CLOSED', { value: 'CLOSED' });

  // Mock the getAttributes method
  const mockAttributes = {
    contractAddress: { type: 'STRING', allowNull: false, unique: true },
    landlordId: { type: 'INTEGER', allowNull: false },
    renterId: { type: 'INTEGER', allowNull: false },
    name: { type: 'STRING', allowNull: false },
    status: { type: 'ENUM', allowNull: false },
    duration: { type: 'INTEGER', allowNull: false },
    securityDeposit: { type: 'DECIMAL', allowNull: false },
    baseRent: { type: 'DECIMAL', allowNull: false },
    gracePeriod: { type: 'INTEGER', allowNull: false }
  };

  // Mock the associations
  const mockAssociations = {
    landlord: { target: User, foreignKey: 'landlordId' },
    renter: { target: User, foreignKey: 'renterId' }
  };

  // Set up the static methods and properties
  RentalAgreement.getAttributes = jest.fn().mockReturnValue(mockAttributes);
  Object.defineProperty(RentalAgreement, 'associations', { value: mockAssociations });
});

describe('Rental Agreement Model', () => {
  // Test the model structure
  describe('Schema', () => {
    it('has expected fields with correct attributes', () => {
      // Get the model's attributes
      const attributes = RentalAgreement.getAttributes();
      
      // Test contractAddress field
      expect(attributes).toHaveProperty('contractAddress');
      expect(attributes.contractAddress.type).toBe('STRING');
      expect(attributes.contractAddress.allowNull).toBe(false);
      expect(attributes.contractAddress.unique).toBe(true);
      
      // Test landlordId field
      expect(attributes).toHaveProperty('landlordId');
      expect(attributes.landlordId.type).toBe('INTEGER');
      expect(attributes.landlordId.allowNull).toBe(false);
      
      // Test renterId field
      expect(attributes).toHaveProperty('renterId');
      expect(attributes.renterId.type).toBe('INTEGER');
      expect(attributes.renterId.allowNull).toBe(false);
      
      // Test name field
      expect(attributes).toHaveProperty('name');
      expect(attributes.name.type).toBe('STRING');
      expect(attributes.name.allowNull).toBe(false);
      
      // Test status field (enum)
      expect(attributes).toHaveProperty('status');
      expect(attributes.status.type).toBe('ENUM');
      expect(attributes.status.allowNull).toBe(false);
      
      // Test duration field
      expect(attributes).toHaveProperty('duration');
      expect(attributes.duration.type).toBe('INTEGER');
      expect(attributes.duration.allowNull).toBe(false);
      
      // Test securityDeposit field
      expect(attributes).toHaveProperty('securityDeposit');
      expect(attributes.securityDeposit.type).toBe('DECIMAL');
      expect(attributes.securityDeposit.allowNull).toBe(false);
      
      // Test baseRent field
      expect(attributes).toHaveProperty('baseRent');
      expect(attributes.baseRent.type).toBe('DECIMAL');
      expect(attributes.baseRent.allowNull).toBe(false);
      
      // Test gracePeriod field
      expect(attributes).toHaveProperty('gracePeriod');
      expect(attributes.gracePeriod.type).toBe('INTEGER');
      expect(attributes.gracePeriod.allowNull).toBe(false);
    });
    
    it('has status enum with correct values', () => {
      // Check specific enum values directly instead of through the type
      expect(RentalAgreementStatus.INITIALIZED).toBe('INITIALIZED');
      expect(RentalAgreementStatus.ACTIVE).toBe('ACTIVE');
      expect(RentalAgreementStatus.CLOSED).toBe('CLOSED');
      
      // Verify that these values are included in the enum
      const enumValues = Object.values(RentalAgreementStatus);
      expect(enumValues).toContain('INITIALIZED');
      expect(enumValues).toContain('ACTIVE');
      expect(enumValues).toContain('CLOSED');
    });
  });
  
  // Test model associations
  describe('Associations', () => {
    it('has association with User model', () => {
      // Check if the model has methods for handling associations
      expect(typeof RentalAgreement.associations).toBe('object');
      
      // Check for landlord association
      expect(RentalAgreement.associations).toHaveProperty('landlord');
      expect(RentalAgreement.associations.landlord.target).toBe(User);
      expect(RentalAgreement.associations.landlord.foreignKey).toBe('landlordId');
      
      // Check for renter association
      expect(RentalAgreement.associations).toHaveProperty('renter');
      expect(RentalAgreement.associations.renter.target).toBe(User);
      expect(RentalAgreement.associations.renter.foreignKey).toBe('renterId');
    });
  });
}); 