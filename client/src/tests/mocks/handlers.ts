import { rest } from 'msw';

// Define API base URL
const apiUrl = 'http://localhost:5000';

// Define request handlers
export const handlers = [
  // Auth endpoints
  rest.post(`${apiUrl}/api/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        message: 'User registered successfully',
        user: {
          id: '1',
          email: 'test@example.com',
          walletAddress: '0x123TestWalletAddress'
        }
      })
    );
  }),

  rest.get(`${apiUrl}/api/auth/profile`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: '1',
        email: 'test@example.com',
        walletAddress: '0x123TestWalletAddress'
      })
    );
  }),

  // Rental endpoints
  rest.get(`${apiUrl}/api/rental`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          address: '0x123RentalContract',
          landlord: '0x456LandlordAddress',
          tenant: '0x789TenantAddress',
          rent: '0.5',
          status: 'ACTIVE'
        }
      ])
    );
  }),

  // Loan endpoints
  rest.get(`${apiUrl}/api/loan/requests`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '1',
          borrower: '0x123BorrowerAddress',
          rentalAddress: '0x456RentalAddress',
          amount: '1.0',
          status: 'PENDING'
        }
      ])
    );
  })
]; 