// Mock for Sequelize database
const mockSequelize = {
  sync: jest.fn().mockResolvedValue({}),
  close: jest.fn().mockResolvedValue({}),
  transaction: jest.fn().mockImplementation(callback => {
    const mockTransaction = {
      commit: jest.fn().mockResolvedValue({}),
      rollback: jest.fn().mockResolvedValue({})
    };
    
    if (callback) {
      return callback(mockTransaction);
    }
    
    return mockTransaction;
  })
};

// Mock models for common database operations
const mockDbOperations = {
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  findByPk: jest.fn()
};

// Default successful responses for different operations
const defaultResponses = {
  // User model default responses
  userFindOne: {
    id: 1,
    firebaseId: 'test-firebase-id',
    email: 'test@example.com',
    walletAddress: '0x123TestWalletAddress',
    update: jest.fn().mockResolvedValue({})
  },
  
  // Mock successful creation
  userCreate: {
    id: 1,
    firebaseId: 'test-firebase-id',
    email: 'test@example.com',
    walletAddress: '0x123TestWalletAddress'
  }
};

// Set default mock implementation
mockDbOperations.findOne.mockResolvedValue(defaultResponses.userFindOne);
mockDbOperations.create.mockResolvedValue(defaultResponses.userCreate);
mockDbOperations.findAll.mockResolvedValue([defaultResponses.userFindOne]);
mockDbOperations.update.mockResolvedValue([1]);
mockDbOperations.destroy.mockResolvedValue(1);
mockDbOperations.count.mockResolvedValue(1);
mockDbOperations.findByPk.mockResolvedValue(defaultResponses.userFindOne);

export {
  mockSequelize as default,
  mockDbOperations,
  defaultResponses
}; 