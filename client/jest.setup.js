// Setup for Node environment testing

// Mock setImmediate
global.setImmediate = jest.fn();

// Silence console errors during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
