import { User as AppUser } from '../types/user.types';
import { User as FirebaseUser } from 'firebase/auth';
import { apiCall } from './api.service';
import { RentalAgreement } from '../types/rental.types';

export const RentalAgreementApi = {
  // Get all rental agreements for the current user
  async getRentalAgreements(user: FirebaseUser | AppUser | null) {
    return apiCall('/api/rental', 'GET', user);
  },
  
  // Get a specific rental agreement by ID or address
  async getRentalAgreementDetails(user: FirebaseUser | AppUser | null, id: string) {
    return apiCall(`/api/rental/${id}`, 'GET', user);
  },
  
  // Create a new rental agreement in the database
  async createRentalAgreement(
    user: FirebaseUser | AppUser | null, 
    data: {
      contractAddress: string;
      name: string;
      landlordId: string;
      tenantId: string;
      status: string;
      propertyAddress: string;
      propertyNftId: string;
      tenant: string;
      rentAmount: string;
      securityDeposit: string;
      rentDuration: number;
      paymentInterval: number;
    }
  ) {
    return apiCall('/api/rental/create', 'POST', user, data);
  },
  
  // Update a rental agreement
  async updateRentalAgreement(
    user: FirebaseUser | AppUser | null, 
    id: string,
    data: Partial<RentalAgreement>
  ) {
    return apiCall(`/api/rental/${id}`, 'PUT', user, data);
  },
  
  // Pay security deposit
  async paySecurityDeposit(
    user: FirebaseUser | AppUser | null,
    address: string,
    transactionHash: string
  ) {
    return apiCall(`/api/rental/${address}/pay-deposit`, 'POST', user, { transactionHash });
  },
  
  // Pay rent
  async payRent(
    user: FirebaseUser | AppUser | null,
    address: string,
    amount: string,
    transactionHash: string,
    month: number
  ) {
    return apiCall(`/api/rental/${address}/pay-rent`, 'POST', user, { 
      amount, 
      transactionHash,
      month
    });
  },
  
  // Skip rent payment
  async skipRent(
    user: FirebaseUser | AppUser | null,
    address: string,
    month: number,
    transactionHash: string
  ) {
    return apiCall(`/api/rental/${address}/skip-rent`, 'POST', user, { month, transactionHash });
  },
  
  // Extend rental agreement
  async extendRental(
    user: FirebaseUser | AppUser | null,
    address: string,
    additionalMonths: number,
    transactionHash: string
  ) {
    return apiCall(`/api/rental/${address}/extend`, 'POST', user, { 
      additionalMonths, 
      transactionHash 
    });
  },
  
  // Update rental agreement status to CLOSED
  async updateStatusToClosed(
    user: FirebaseUser | AppUser | null,
    address: string
  ) {
    return apiCall(`/api/rental/${address}/update-status-closed`, 'POST', user);
  }
}; 