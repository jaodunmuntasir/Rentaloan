// Mock Firebase admin implementation
const mockFirebaseAdmin = {
  auth: jest.fn().mockReturnValue({
    // Token verification
    verifyIdToken: jest.fn().mockImplementation((token) => {
      if (token === 'invalid-token') {
        return Promise.reject(new Error('Invalid token'));
      }
      return Promise.resolve({ uid: 'test-user-id' });
    }),
    
    // User retrieval
    getUser: jest.fn().mockImplementation((uid) => {
      if (uid === 'not-found') {
        return Promise.reject(new Error('User not found'));
      }
      return Promise.resolve({
        uid: uid || 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
      });
    }),
    
    // User creation
    createUser: jest.fn().mockImplementation((userData) => {
      if (userData.email === 'error@example.com') {
        return Promise.reject(new Error('Failed to create user'));
      }
      return Promise.resolve({
        uid: 'new-user-id',
        email: userData.email,
        displayName: userData.displayName
      });
    }),
    
    // User update
    updateUser: jest.fn().mockImplementation((uid, userData) => {
      if (uid === 'error-user') {
        return Promise.reject(new Error('Failed to update user'));
      }
      return Promise.resolve({
        uid,
        ...userData
      });
    })
  })
};

export default mockFirebaseAdmin; 