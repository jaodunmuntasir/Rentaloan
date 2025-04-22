// Basic test suite that doesn't rely on any imports
describe('Simple Tests', () => {
  test('addition works', () => {
    expect(1 + 1).toBe(2);
  });

  test('string concatenation works', () => {
    expect('hello ' + 'world').toBe('hello world');
  });
}); 