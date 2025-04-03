export interface User {
  id: string;
  email: string;
  name: string;
  walletAddress: string | null;
  token?: string;
} 