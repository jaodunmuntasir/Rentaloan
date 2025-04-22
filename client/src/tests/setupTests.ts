// jest-dom adds custom jest matchers for asserting on DOM nodes
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Configure msw before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset request handlers between tests
afterEach(() => server.resetHandlers());

// Clean up after all tests are done
afterAll(() => server.close());

// Mock global window object
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
window.scrollTo = jest.fn(); 