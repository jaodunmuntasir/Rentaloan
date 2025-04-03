import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { UserApi } from '../services/api.service';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  walletAddress: string | null;
  createdAt: string;
}

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const { walletAddress, isConnected, connectWallet, walletBalance } = useWallet();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const data = await UserApi.getProfile(currentUser);
        if (data) {
          setProfile(data as ProfileData);
          setName(data.name || '');
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchProfileData();
    }
  }, [currentUser]);

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
      setUpdateLoading(true);
      
      // Update Firebase profile
      await updateUserProfile({ displayName: name });
      
      // Update backend profile
      await UserApi.updateProfile(currentUser, { name });
      
      // Update local state
      if (profile) {
        setProfile({ ...profile, name });
      }
      
      setIsEditing(false);
      setUpdateSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Handle wallet connection
  const handleConnectWallet = async () => {
    if (!currentUser) {
      console.log("Cannot connect wallet: User not logged in");
      return;
    }
    
    try {
      console.log("Attempting to connect wallet...");
      const success = await connectWallet();
      console.log("Connect wallet result:", success);
      
      if (success) {
        console.log("Wallet connected successfully, refreshing profile data");
        // Refresh profile data to get updated wallet address
        const data = await UserApi.getProfile(currentUser);
        if (data) {
          setProfile(data as ProfileData);
          console.log("Profile updated with wallet:", data.walletAddress);
        }
      } else {
        setError("Failed to connect wallet. Please try again.");
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(`Failed to connect wallet: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      
      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success alert */}
      {updateSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">Profile updated successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Information */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Personal Information</h2>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleProfileUpdate} className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  placeholder="Email address"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email cannot be changed
                </p>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className={`${
                    updateLoading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1 text-sm text-gray-900">{profile?.name || 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Account Created</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {profile?.createdAt 
                    ? new Date(profile.createdAt).toLocaleDateString() 
                    : 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Wallet Information */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Wallet Information</h2>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Connected Wallet</h3>
            {isConnected ? (
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {walletAddress || profile?.walletAddress || 'Not connected'}
              </p>
            ) : (
              <p className="mt-1 text-sm text-red-500">No wallet connected</p>
            )}
          </div>
          
          {isConnected && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Wallet Balance</h3>
              <p className="mt-1 text-sm text-gray-900">
                {walletBalance ? `${walletBalance} ETH` : 'Loading balance...'}
              </p>
            </div>
          )}
          
          {!isConnected && (
            <button
              onClick={handleConnectWallet}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Connect Wallet Manually
            </button>
          )}
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Your wallet is used for all blockchain transactions including creating rental agreements, 
              paying rent, and interacting with loans. Your wallet connects automatically when you log in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 