// Simple example test to verify testing setup
import { createMockRequest, createMockResponse } from '../tests/utils';

describe('Example Tests', () => {
  test('mock request works', () => {
    const req = createMockRequest({
      body: { test: 'value' },
      params: { id: '123' }
    });
    
    expect(req.body).toEqual({ test: 'value' });
    expect(req.params).toEqual({ id: '123' });
  });
  
  test('mock response works', () => {
    const res = createMockResponse();
    
    // Ensure methods are defined before calling
    if (res.status && res.json) {
      res.status(200).json({ success: true });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    } else {
      fail('Response methods are not properly mocked');
    }
  });
  
  test('basic math works', () => {
    expect(2 + 2).toBe(4);
  });
}); 