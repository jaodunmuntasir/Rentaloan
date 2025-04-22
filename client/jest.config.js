module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/'
  ],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
}; 