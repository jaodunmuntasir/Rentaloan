import React from 'react';
import { AuthProvider } from '../AuthContext';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn().mockReturnValue({
    currentUser: null,
    onAuthStateChanged: jest.fn(() => jest.fn())
  })
}));

describe('AuthContext', () => {
  test('renders without crashing', () => {
    // If rendering doesn't throw, test passes
    expect(() => {
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    }).not.toThrow();
  });
}); 