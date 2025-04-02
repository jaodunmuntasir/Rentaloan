import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signUp: (email: string, password: string, name: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await signInWithEmailAndPassword(auth, email, password);
    return response.user;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const response = await createUserWithEmailAndPassword(auth, email, password);
    
    if (response.user) {
      await updateProfile(response.user, { displayName: name });
      
      // Make API call to create user in the backend
      try {
        const idToken = await response.user.getIdToken();
        await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            name,
            email,
            role: 'renter' // Default role, can be changed later
          })
        });
      } catch (error) {
        console.error('Error registering user in backend:', error);
      }
    }
    
    return response.user;
  };

  const logout = () => {
    return signOut(auth);
  };

  const updateUserProfile = async (displayName: string) => {
    if (currentUser) {
      await updateProfile(currentUser, { displayName });
      
      // Update user in context after profile update
      setCurrentUser({ ...currentUser });
    }
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signUp,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 