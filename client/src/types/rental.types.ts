export interface RentalAgreement {
  id: string;
  contractAddress: string;
  name: string;
  landlordId: string;
  tenantId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    email: string;
    walletAddress: string | null;
  };
  landlord?: {
    id: string;
    name: string;
    email: string;
    walletAddress: string | null;
  };
} 