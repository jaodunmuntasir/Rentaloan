import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { UserApi } from '../services/api.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { CreditCard, ChevronRight } from 'lucide-react';

interface DashboardData {
  role: string;
  rentalAgreements: any[];
  loanAgreements: any[];
  loanRequests: any[];
  loanOffers: any[];
  recentPayments: any[];
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { isConnected, connectWallet } = useWallet();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await UserApi.getDashboard(currentUser);
        setDashboardData(data as DashboardData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // Handle wallet connect
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Error connecting wallet:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If wallet not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Welcome to RentLoan</h2>
        <p className="mb-4">Connect your wallet to start using the platform.</p>
        <button
          onClick={handleConnectWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link 
              to="/rental/create" 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create Rental
            </Link>
            <Link 
              to="/loan/requests/create" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Request Loan
            </Link>
            <Link 
              to="/loan/requests" 
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              View Loan Requests
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Account Overview</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {currentUser?.displayName}</p>
            <p><span className="font-medium">Email:</span> {currentUser?.email}</p>
            <p><span className="font-medium">Role:</span> {dashboardData?.role || 'User'}</p>
          </div>
        </div>
      </div>
      
      {/* Active Agreements */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Active Agreements</h2>
        
        {/* Rental Agreements */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Rental Agreements</h3>
          {dashboardData?.rentalAgreements && dashboardData.rentalAgreements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.rentalAgreements.map((agreement) => (
                    <tr key={agreement.address}>
                      <td className="px-6 py-4 whitespace-nowrap">{agreement.propertyAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{agreement.userRole}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{agreement.rentAmount} ETH</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agreement.status === 'Active' ? 'bg-green-100 text-green-800' :
                          agreement.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {agreement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link to={`/rental/${agreement.address}`} className="text-blue-600 hover:text-blue-900">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No rental agreements found.</p>
          )}
        </div>
        
        {/* Loan Agreements */}
        <div>
          <h3 className="text-lg font-medium mb-3">Loan Agreements</h3>
          {dashboardData?.loanAgreements && dashboardData.loanAgreements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Rental</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.loanAgreements.map((agreement) => (
                    <tr key={agreement.address}>
                      <td className="px-6 py-4 whitespace-nowrap">{agreement.rentalAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{agreement.userRole}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{agreement.loanAmount} ETH</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agreement.status === 'Active' ? 'bg-green-100 text-green-800' :
                          agreement.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {agreement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link to={`/loan/agreements/${agreement.address}`} className="text-blue-600 hover:text-blue-900">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No loan agreements found.</p>
          )}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        {dashboardData?.recentPayments && dashboardData.recentPayments.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.recentPayments.map((payment, index) => (
              <div key={index} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{payment.type}</p>
                  <p className="text-sm text-gray-500">{payment.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${payment.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {payment.amount > 0 ? '+' : ''}{payment.amount} ETH
                  </p>
                  <p className="text-sm text-gray-500">{new Date(payment.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            <div className="mt-4 text-center">
              <Link to="/user/payments" className="text-blue-600 hover:text-blue-800 text-sm">
                View all activity
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No recent activity.</p>
        )}
      </div>

      {/* Loan Summary */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">
            <Link to="/loan" className="flex items-center gap-2 hover:text-primary transition-colors">
              <CreditCard className="h-5 w-5" />
              Loan Activity
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardTitle>
          <CardDescription>Overview of your loan activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">As Borrower</p>
                <div className="rounded-lg border p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Active Loans</p>
                      <p className="text-2xl font-bold">2</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Next Payment</p>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">123 Main St</p>
                    <p className="text-sm text-muted-foreground">Due in 7 days</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">0.22 ETH</p>
                    <Link to="/loan/agreement/0x1234567890123456789012345678901234567890" className="text-sm text-primary">
                      Pay Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">As Lender</p>
                <div className="rounded-lg border p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Active Loans</p>
                      <p className="text-2xl font-bold">1</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Loan Opportunities</p>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Open Requests</p>
                    <p className="text-sm text-muted-foreground">5 new requests</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/loan/requests">View All</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/loan">View All Loan Activity</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 