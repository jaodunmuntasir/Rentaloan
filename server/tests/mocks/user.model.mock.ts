import { mockDbOperations, defaultResponses } from './sequelize.mock';

// Create a mock User model with common methods
const UserModel = {
  ...mockDbOperations,
  findOne: jest.fn().mockResolvedValue(defaultResponses.userFindOne),
  create: jest.fn().mockResolvedValue(defaultResponses.userCreate),
  findAll: jest.fn().mockResolvedValue([defaultResponses.userFindOne]),
  update: jest.fn().mockResolvedValue([1]),
  destroy: jest.fn().mockResolvedValue(1),
  findByPk: jest.fn().mockResolvedValue(defaultResponses.userFindOne),
};

export default UserModel; 