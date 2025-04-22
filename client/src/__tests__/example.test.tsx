// Simple example test to verify testing setup
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component
const HelloWorld = () => <div>Hello, World!</div>;

describe('Example Test', () => {
  test('renders hello world', () => {
    const { container } = render(<HelloWorld />);
    expect(container.textContent).toBe('Hello, World!');
  });

  test('basic sum test', () => {
    expect(1 + 1).toBe(2);
  });
}); 