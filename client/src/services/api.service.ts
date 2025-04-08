import { User as FirebaseUser } from 'firebase/auth';
import { User as AppUser } from '../types/user.types';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Set API base URL based on environment
const baseURL = process.env.REACT_APP_API_URL || API_URL;

// Create axios instance
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add authorization header to requests when user is provided
const getAuthHeader = (user: AppUser) => {
  return {
    headers: {
      'Authorization': `Bearer ${user.token}`
    }
  };
};

// Helper to get auth token
async function getAuthToken(user: FirebaseUser | null): Promise<string | null> {
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Base API call with authentication
export async function apiCall(
  endpoint: string, 
  method: string, 
  user: FirebaseUser | AppUser | null, 
  data?: any
): Promise<any> {
  try {
    // Handle different user types (Firebase User vs App User)
    let token = null;
    if (user) {
      if ('getIdToken' in user) {
        // It's a Firebase user
        token = await getAuthToken(user as FirebaseUser);
      } else if ('token' in user) {
        // It's our app user with a token property
        token = (user as AppUser).token || null;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config: RequestInit = {
      method,
      headers,
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `API error: ${response.status}`);
    }
    
    // Check if response is empty
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error(`API call error (${endpoint}):`, error);
    throw error;
  }
}

// User related API calls
export const UserApi = {
  // Get current user profile
  async getProfile(user: FirebaseUser | AppUser | null) {
    return apiCall('/api/user/profile', 'GET', user);
  },
  
  // Update user profile
  async updateProfile(user: FirebaseUser | AppUser | null, data: {
    name?: string;
    walletAddress?: string;
  }) {
    return apiCall('/api/user/profile', 'PUT', user, data);
  },
  
  // Get user dashboard data
  async getDashboard(user: FirebaseUser | AppUser | null) {
    return apiCall('/api/user/dashboard', 'GET', user);
  },
  
  // Get user payment history
  async getPayments(user: FirebaseUser | AppUser | null, page = 1, limit = 10) {
    return apiCall(`/api/user/payments?page=${page}&limit=${limit}`, 'GET', user);
  },
  
  // Find user by email
  async findUserByEmail(user: FirebaseUser | AppUser | null, email: string) {
    return apiCall(`/api/user/find?email=${encodeURIComponent(email)}`, 'GET', user);
  }
};

// Rental agreement related API calls
export const RentalApi = {
  // Create rental agreement
  async createRental(user: FirebaseUser | AppUser | null, data: {
    contractAddress: string;
    renterEmail: string;
    duration: number;
    securityDeposit: string;
    baseRent: string;
    name: string;
    transactionHash?: string;
  }) {
    // Use the existing endpoint whether the contract exists or not
    return apiCall('/api/rental/create', 'POST', user, data);
  },
  
  // Get all rental agreements
  async getRentals(user: FirebaseUser | AppUser | null) {
    return apiCall('/api/rental', 'GET', user);
  },
  
  // Get a specific rental agreement
  async getRental(user: FirebaseUser | AppUser | null, address: string) {
    return apiCall(`/api/rental/${address}`, 'GET', user);
  },
  
  // Pay security deposit
  async paySecurityDeposit(user: FirebaseUser | AppUser | null, address: string, transactionHash: string) {
    return apiCall(`/api/rental/${address}/pay-deposit`, 'POST', user, { transactionHash });
  },
  
  // Pay rent
  async payRent(user: FirebaseUser | AppUser | null, address: string, amount: string, transactionHash: string) {
    return apiCall(`/api/rental/${address}/pay-rent`, 'POST', user, { 
      amount, 
      transactionHash 
    });
  },
  
  // Skip rent payment
  async skipRent(user: FirebaseUser | AppUser | null, address: string, month: number, transactionHash: string) {
    return apiCall(`/api/rental/${address}/skip-rent`, 'POST', user, { month, transactionHash });
  },
  
  // Extend rental agreement
  async extendRental(user: FirebaseUser | AppUser | null, address: string, additionalMonths: number, transactionHash: string) {
    return apiCall(`/api/rental/${address}/extend`, 'POST', user, { 
      additionalMonths, 
      transactionHash 
    });
  }
};

// Loan related API calls
export const LoanApi = {
  // Get all loan requests (excludes current user's requests, only OPEN status)
  async getLoanRequests(
    user: AppUser
  ): Promise<{ loanRequests: any[]; success: boolean; error?: string }> {
    try {
      const response = await apiCall('/api/loan/requests', 'GET', user);

      return {
        loanRequests: response?.loanRequests || [],
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching loan requests:', error);
      return {
        loanRequests: [],
        success: false,
        error: error.message || 'Failed to fetch loan requests',
      };
    }
  },

  // Get loan requests created by the current user
  async getMyLoanRequests(
    user: AppUser
  ): Promise<{ loanRequests: any[]; success: boolean; error?: string }> {
    try {
      const response = await apiCall('/api/loan/myrequests', 'GET', user);

      return {
        loanRequests: response?.loanRequests || [],
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching user loan requests:', error);
      return {
        loanRequests: [],
        success: false,
        error: error.message || 'Failed to fetch your loan requests',
      };
    }
  },

  // Get loan offers created by the current user
  async getMyLoanOffers(
    user: AppUser
  ): Promise<{ loanOffers: any[]; success: boolean; error?: string }> {
    try {
      const response = await apiCall('/api/loan/myoffers', 'GET', user);

      return {
        loanOffers: response?.loanOffers || [],
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching user loan offers:', error);
      return {
        loanOffers: [],
        success: false,
        error: error.message || 'Failed to fetch your loan offers',
      };
    }
  },

  // Get a specific loan request by ID
  async getLoanRequest(
    user: AppUser,
    requestId: string
  ): Promise<{ loanRequest: any; loanOffers: any[]; success: boolean; error?: string }> {
    try {
      if (!user || !user.token) {
        console.error('Error fetching loan request: No valid user or token provided');
        return {
          loanRequest: null,
          loanOffers: [],
          success: false,
          error: 'Authentication error: No valid user token',
        };
      }
      
      const response = await apiCall(`/api/loan/requests/${requestId}`, 'GET', user);
      console.log('Loan request fetched successfully:', response);
      
      return {
        loanRequest: response?.loanRequest || null,
        loanOffers: response?.loanOffers || [],
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching loan request:', error);
      // Check for specific error types
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return {
          loanRequest: null,
          loanOffers: [],
          success: false,
          error: 'Authentication error: Please log in again to refresh your session',
        };
      }
      return {
        loanRequest: null,
        loanOffers: [],
        success: false,
        error: error.message || 'Failed to fetch loan request',
      };
    }
  },

  // Create a loan request
  async createLoanRequest(
    user: AppUser,
    data: {
      rentalAgreementAddress: string;
      requestedAmount: string;
      duration: number;
      interestRate: number;
    }
  ): Promise<{ loanRequest: any; success: boolean; error?: string }> {
    try {
      console.log('Creating loan request with data:', JSON.stringify(data));
      // Ensure we're sending the parameters in the format the server expects
      const requestData = {
        rentalAgreementAddress: data.rentalAgreementAddress,
        requestedAmount: data.requestedAmount,
        duration: data.duration,
        interestRate: data.interestRate
      };
      const response = await apiCall('/api/loan/request', 'POST', user, requestData);

      return {
        loanRequest: response?.loanRequest || null,
        success: true,
      };
    } catch (error: any) {
      console.error('Error creating loan request:', error);
      return {
        loanRequest: null,
        success: false,
        error: error.message || 'Failed to create loan request',
      };
    }
  },

  // Create a loan offer
  async createLoanOffer(
    user: AppUser,
    data: {
      requestId: string;
      interestRate: number;
      offerAmount: string;
    }
  ): Promise<{ loanOffer: any; success: boolean; error?: string }> {
    try {
      const response = await apiCall('/api/loan/offer', 'POST', user, {
        loanRequestId: data.requestId,
        interestRate: data.interestRate,
        offerAmount: data.offerAmount
      });

      return {
        loanOffer: response?.loanOffer || null,
        success: true,
      };
    } catch (error: any) {
      console.error('Error creating loan offer:', error);
      return {
        loanOffer: null,
        success: false,
        error: error.message || 'Failed to create loan offer',
      };
    }
  },

  // Accept a loan offer
  async acceptLoanOffer(
    user: AppUser,
    offerId: string
  ): Promise<{ loanAgreement: any; success: boolean; error?: string }> {
    try {
      const response = await apiCall(`/api/loan/offer/${offerId}/accept`, 'POST', user);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to accept loan offer');
      }

      return {
        loanAgreement: response?.loanAgreement || null,
        success: true,
      };
    } catch (error: any) {
      console.error('Error accepting loan offer:', error);
      return {
        loanAgreement: null,
        success: false,
        error: error.message || 'Failed to accept loan offer',
      };
    }
  },
  
  // Register a blockchain loan agreement in the database
  async registerLoanAgreement(
    user: AppUser,
    data: {
      offerId: string;
      contractAddress: string;
      transactionHash: string;
    }
  ): Promise<{ loanAgreement: any; success: boolean; error?: string }> {
    try {
      const response = await apiCall('/api/loan/agreement/register', 'POST', user, data);

      return {
        loanAgreement: response?.loanAgreement || null,
        success: true,
      };
    } catch (error: any) {
      console.error('Error registering loan agreement:', error);
      return {
        loanAgreement: null,
        success: false,
        error: error.message || 'Failed to register loan agreement',
      };
    }
  },
  
  // Withdraw a loan offer
  async withdrawLoanOffer(
    user: AppUser,
    offerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiCall(`/api/loan/offer/${offerId}/withdraw`, 'POST', user);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error withdrawing loan offer:', error);
      return {
        success: false,
        error: error.message || 'Failed to withdraw loan offer',
      };
    }
  },

  // Get all loan agreements for a user
  getLoanAgreements: async (user: AppUser) => {
    try {
      const response = await api.get(
        '/api/loan/agreements', 
        getAuthHeader(user)
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching loan agreements:', error);
      throw error;
    }
  },

  // Get a single loan agreement by ID
  getLoanAgreement: async (user: AppUser, agreementId: string) => {
    try {
      const response = await api.get(
        `/api/loan/agreement/${agreementId}`, 
        getAuthHeader(user)
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching loan agreement:', error);
      throw error;
    }
  },
  
  // Initialize a loan (for lender)
  initializeLoan: async (user: AppUser, contractAddress: string, transactionHash: string) => {
    try {
      const response = await api.post(
        `/api/loan/agreement/${contractAddress}/initialize`, 
        { transactionHash }, 
        getAuthHeader(user)
      );
      return response.data;
    } catch (error) {
      console.error('Error initializing loan:', error);
      throw error;
    }
  },
  
  // Make a loan repayment (for borrower)
  makeRepayment: async (user: AppUser, contractAddress: string, month: number, amount: string, transactionHash: string) => {
    try {
      const response = await api.post(
        `/api/loan/agreement/${contractAddress}/repay`, 
        { 
          month, 
          amount, 
          transactionHash 
        }, 
        getAuthHeader(user)
      );
      return response.data;
    } catch (error) {
      console.error('Error making loan repayment:', error);
      throw error;
    }
  },
  
  // Update loan agreement status based on blockchain status
  updateLoanStatus: async (user: AppUser, contractAddress: string, status: number) => {
    try {
      const response = await api.post(
        `/api/loan/agreement/${contractAddress}/update-status`,
        { status },
        getAuthHeader(user)
      );
      return response.data;
    } catch (error) {
      console.error('Error updating loan status:', error);
      throw error;
    }
  },
  
  // Record a blockchain payment in the database
  recordPayment: async (user: AppUser, contractAddress: string, month: number, amount: string, txHash: string) => {
    try {
      const response = await api.post(
        `/api/loan/agreement/${contractAddress}/payment`,
        { month, amount, txHash },
        getAuthHeader(user)
      );
      return response.data;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }
}; 