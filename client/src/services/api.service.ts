import { User as FirebaseUser } from 'firebase/auth';
import { User as AppUser } from '../types/user.types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
export async function apiCall<T>(
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
    return apiCall<{
      id: string;
      email: string;
      name: string;
      walletAddress: string | null;
      createdAt: string;
    }>('/api/user/profile', 'GET', user);
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
    propertyAddress: string;
    propertyNftId: string;
    tenant: string;
    rentAmount: string;
    securityDeposit: string;
    rentDuration: number;
    paymentInterval: number;
  }) {
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
  async skipRent(user: FirebaseUser | AppUser | null, address: string) {
    return apiCall(`/api/rental/${address}/skip-rent`, 'POST', user);
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
  // Create loan request
  async createLoanRequest(user: FirebaseUser | AppUser | null, data: {
    rentalAgreementAddress: string;
    requestedAmount: string;
    loanDuration: number;
    maxInterestRate: number;
  }) {
    return apiCall('/api/loan/request', 'POST', user, data);
  },
  
  // Get all loan requests
  async getLoanRequests(user: FirebaseUser | AppUser | null) {
    return apiCall('/api/loan/requests', 'GET', user);
  },
  
  // Get a specific loan request
  async getLoanRequest(user: FirebaseUser | AppUser | null, id: string) {
    return apiCall(`/api/loan/request/${id}`, 'GET', user);
  },
  
  // Create loan offer
  async createLoanOffer(user: FirebaseUser | AppUser | null, data: {
    loanRequestId: string;
    offerAmount: string;
    interestRate: number;
    loanDuration: number;
    graceMonths: number;
  }) {
    return apiCall('/api/loan/offer', 'POST', user, data);
  },
  
  // Get all loan offers for a request
  async getLoanOffers(user: FirebaseUser | AppUser | null, requestId: string) {
    return apiCall(`/api/loan/request/${requestId}/offers`, 'GET', user);
  },
  
  // Accept a loan offer
  async acceptLoanOffer(user: FirebaseUser | AppUser | null, offerId: string) {
    return apiCall(`/api/loan/offer/${offerId}/accept`, 'POST', user);
  },
  
  // Create loan agreement on blockchain
  async createLoanAgreement(user: FirebaseUser | AppUser | null, data: {
    loanOfferId: string;
    contractAddress: string;
    transactionHash: string;
  }) {
    return apiCall('/api/loan/create', 'POST', user, data);
  },
  
  // Get all loan agreements
  async getLoanAgreements(user: FirebaseUser | AppUser | null) {
    return apiCall('/api/loan/agreements', 'GET', user);
  },
  
  // Get a specific loan agreement
  async getLoanAgreement(user: FirebaseUser | AppUser | null, address: string) {
    return apiCall(`/api/loan/agreement/${address}`, 'GET', user);
  },
  
  // Initialize loan (as lender)
  async initializeLoan(user: FirebaseUser | AppUser | null, address: string, transactionHash: string) {
    return apiCall(`/api/loan/agreement/${address}/initialize`, 'POST', user, { 
      transactionHash 
    });
  },
  
  // Make loan repayment (as borrower)
  async makeRepayment(user: FirebaseUser | AppUser | null, address: string, month: number, amount: string, transactionHash: string) {
    return apiCall(`/api/loan/agreement/${address}/repay`, 'POST', user, { 
      month, 
      amount, 
      transactionHash 
    });
  }
}; 