import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({
    login: jest.fn()
  }),
}));

// Mock the react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('Login Page', () => {
  test('renders without crashing', () => {
    expect(() => {
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    }).not.toThrow();
  });
}); 