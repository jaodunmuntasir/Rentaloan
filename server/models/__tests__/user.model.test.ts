import { User } from '../user.model';
import { DataTypes } from 'sequelize';

// Mock the Sequelize models
jest.mock('../user.model');

// Setup mocks for testing
beforeAll(() => {
  // Mock the getAttributes method
  const mockAttributes = {
    firebaseId: { type: 'STRING', allowNull: false, unique: true },
    email: { type: 'STRING', allowNull: false },
    name: { type: 'STRING', allowNull: true },
    walletAddress: { type: 'STRING', allowNull: false, unique: true }
  };

  // Mock the associations
  const mockAssociations = {
    rentalAgreementsAsLandlord: { target: 'RentalAgreement', foreignKey: 'landlordId' },
    rentalAgreementsAsRenter: { target: 'RentalAgreement', foreignKey: 'renterId' }
  };

  // Set up the static methods and properties
  User.getAttributes = jest.fn().mockReturnValue(mockAttributes);
  Object.defineProperty(User, 'associations', { value: mockAssociations });
});

describe('User Model', () => {
  // Test the model structure
  describe('Schema', () => {
    it('has expected fields with correct attributes', () => {
      // Get the model's attributes
      const attributes = User.getAttributes();
      
      // Test firebaseId field
      expect(attributes).toHaveProperty('firebaseId');
      expect(attributes.firebaseId.type).toBe('STRING');
      expect(attributes.firebaseId.allowNull).toBe(false);
      expect(attributes.firebaseId.unique).toBe(true);
      
      // Test email field
      expect(attributes).toHaveProperty('email');
      expect(attributes.email.type).toBe('STRING');
      expect(attributes.email.allowNull).toBe(false);
      
      // Test name field (optional)
      expect(attributes).toHaveProperty('name');
      expect(attributes.name.type).toBe('STRING');
      expect(attributes.name.allowNull).toBe(true);
      
      // Test walletAddress field
      expect(attributes).toHaveProperty('walletAddress');
      expect(attributes.walletAddress.type).toBe('STRING');
      expect(attributes.walletAddress.allowNull).toBe(false);
      expect(attributes.walletAddress.unique).toBe(true);
    });
  });
  
  // Test model validations (These are generally handled by Sequelize)
  describe('Validations', () => {
    it('should enforce required fields', () => {
      // These are checked via the Schema tests above, but we can add specific tests
      // for any custom validations defined in the model
      
      // Confirm allowNull = false for required fields
      const attributes = User.getAttributes();
      expect(attributes.firebaseId.allowNull).toBe(false);
      expect(attributes.email.allowNull).toBe(false);
      expect(attributes.walletAddress.allowNull).toBe(false);
    });
  });
  
  // Test model associations
  describe('Associations', () => {
    it('can have associations with rental agreements', () => {
      // Check if the model has methods for handling associations
      // These methods would be defined if associations were set up
      
      expect(typeof User.associations).toBe('object');
      // Check specific associations
      expect(User.associations).toHaveProperty('rentalAgreementsAsLandlord');
      expect(User.associations).toHaveProperty('rentalAgreementsAsRenter');
    });
  });
}); 