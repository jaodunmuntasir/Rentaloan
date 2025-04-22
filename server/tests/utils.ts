import { Request, Response } from 'express';
import UserModel from './mocks/user.model.mock';

// Mock User model to avoid database access during tests
jest.mock('../models/user.model', () => ({
  User: UserModel
}));

// Create a mock request object
export const createMockRequest = (options: {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
}): Partial<Request> => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null
  };
};

// Create a mock response object
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Create a mock next function
export const createMockNext = (): jest.Mock => {
  return jest.fn();
};

// Create a test user in the database
export const createTestUser = async (): Promise<any> => {
  return await UserModel.create({
    firebaseId: 'test-firebase-id',
    email: 'test@example.com',
    walletAddress: '0x123TestWalletAddress'
  });
};

// Helper to generate a mock JWT token
export const generateMockToken = (payload: any): string => {
  return `mock-token-${JSON.stringify(payload)}`;
};

// Helper to create authenticated request
export const createAuthenticatedRequest = (userId: string, options: any = {}): Partial<Request> => {
  return createMockRequest({
    ...options,
    headers: {
      ...options.headers,
      authorization: `Bearer mock-token-${userId}`
    },
    user: {
      uid: userId
    }
  });
}; 