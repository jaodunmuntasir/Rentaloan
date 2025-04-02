import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';

const Layout: React.FC = () => {
  const { logout } = useAuth();
  const { isConnected, walletAddress, walletBalance, connectWallet, disconnectWallet } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle wallet connection
  const handleWalletConnection = async () => {
    if (isConnected) {
      disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  // Navigation items
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/rental', label: 'Rentals' },
    { path: '/loan/requests', label: 'Loan Requests' },
    { path: '/loan/agreements', label: 'Loan Agreements' },
    { path: '/profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">RentLoan</Link>
              </div>

              {/* Desktop navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${
                      location.pathname.startsWith(item.path)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* User and wallet */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
              {/* Wallet status/button */}
              <button
                onClick={handleWalletConnection}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  isConnected
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isConnected
                  ? `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)} (${Number(walletBalance).toFixed(4)} ETH)`
                  : 'Connect Wallet'}
              </button>

              {/* User menu */}
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {/* Heroicon name: menu */}
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${
                    location.pathname.startsWith(item.path)
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Wallet and user actions for mobile */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4 space-y-3">
                <button
                  onClick={handleWalletConnection}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-md ${
                    isConnected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isConnected
                    ? `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)} (${Number(walletBalance).toFixed(4)} ETH)`
                    : 'Connect Wallet'}
                </button>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={handleLogout}
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-auto py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} RentLoan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 