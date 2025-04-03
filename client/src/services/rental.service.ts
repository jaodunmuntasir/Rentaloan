import { User as AppUser } from '../types/user.types';
import { User as FirebaseUser } from 'firebase/auth';
import { apiCall } from './api.service';
import { RentalAgreement } from '../types/rental.types';

export const RentalAgreementApi = {
  // Get all rental agreements for the current user
  async getRentalAgreements(user: FirebaseUser | AppUser | null) {
    return apiCall<RentalAgreement[]>('/api/rental', 'GET', user);
  },
  
  // Get a specific rental agreement by ID or address
  async getRentalAgreementDetails(user: FirebaseUser | AppUser | null, id: string) {
    return apiCall<RentalAgreement>(`/api/rental/${id}`, 'GET', user);
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
    }
  ) {
    return apiCall<RentalAgreement>('/api/rental/create', 'POST', user, data);
  },
  
  // Update a rental agreement
  async updateRentalAgreement(
    user: FirebaseUser | AppUser | null, 
    id: string,
    data: Partial<RentalAgreement>
  ) {
    return apiCall<RentalAgreement>(`/api/rental/${id}`, 'PUT', user, data);
  }
}; 