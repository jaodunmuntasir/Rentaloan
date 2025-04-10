import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { UserApi } from '../services/api.service';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { 
  Loader2, 
  AlertTriangle, 
  RefreshCcw, 
  LayoutDashboard
} from 'lucide-react';
import { Button } from '../components/ui/button';

// Import dashboard components
import StatsOverview from '../components/dashboard/StatsOverview';
import AgreementSummary from '../components/dashboard/AgreementSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import WalletInfo from '../components/dashboard/WalletInfo';

interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string;
    walletAddress: string | null;
  };
  rentalAgreements: any[];
  loanAgreements: any[];
  loanRequests: any[];
  loanOffers: any[];
  recentPayments: any[];
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { isConnected, walletAddress, walletBalance, connectWallet } = useWallet();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackData, setUseFallbackData] = useState(false);

  // Fallback data for when the API fails
  const getFallbackData = (): DashboardData => {
    console.log("Using fallback data due to API error");
    return {
      user: {
        id: currentUser?.uid || '',
        email: currentUser?.email || '',
        name: currentUser?.displayName || 'User',
        walletAddress: walletAddress
      },
      rentalAgreements: [],
      loanAgreements: [],
      loanRequests: [],
      loanOffers: [],
      recentPayments: []
    };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Try to fetch data from the API
        const data = await UserApi.getDashboard(currentUser);
        setDashboardData(data as DashboardData);
        setError(null);
        setUseFallbackData(false);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        // Use fallback data instead
        setDashboardData(getFallbackData());
        setError('Failed to load real-time dashboard data. Showing placeholder data instead.');
        setUseFallbackData(true);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, walletAddress]);

  // Handle wallet connect
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Error connecting wallet:', err);
    }
  };

  // Calculate statistics from dashboard data
  const calculateStatistics = () => {
    if (!dashboardData) return {
      totalRentals: 0,
      activeRentals: 0,
      totalLoans: 0,
      activeLoans: 0,
      totalAmount: 0
    };

    const activeRentals = dashboardData.rentalAgreements.filter(rental => 
      rental.status === 'ACTIVE'
    ).length;

    const activeLoans = dashboardData.loanAgreements.filter(loan => 
      loan.status === 'ACTIVE' || loan.status === 'PAID'
    ).length;

    // Calculate total loan amount handled by the user
    const totalAmount = dashboardData.loanAgreements.reduce((sum, loan) => {
      const amount = parseFloat(loan.amount || '0');
      return isNaN(amount) ? sum : sum + amount;
    }, 0);

    return {
      totalRentals: dashboardData.rentalAgreements.length,
      activeRentals,
      totalLoans: dashboardData.loanAgreements.length,
      activeLoans,
      totalAmount
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-fit"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
        
        {/* Display dashboard with fallback data */}
        {useFallbackData && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                  <LayoutDashboard className="mr-2 h-8 w-8" /> 
                  Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Welcome back, {dashboardData?.user.name || currentUser?.displayName || 'User'}
                </p>
              </div>
            </div>
            
            {/* Stats Overview */}
            <StatsOverview stats={calculateStatistics()} />
            
            {/* Main content grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Agreement Summary - spans 2 columns on medium screens and up */}
              <AgreementSummary 
                rentalAgreements={dashboardData?.rentalAgreements || []}
                loanAgreements={dashboardData?.loanAgreements || []}
              />
              
              {/* Sidebar - spans 1 column */}
              <div className="space-y-6">
                {/* Wallet Information */}
                <WalletInfo
                  walletAddress={walletAddress}
                  walletBalance={walletBalance}
                  isConnected={isConnected}
                  onConnectWallet={handleConnectWallet}
                />
                
              </div>
            </div>
            
            {/* Recent Activity */}
            <RecentActivity payments={dashboardData?.recentPayments || []} />
          </>
        )}
      </div>
    );
  }

  const stats = calculateStatistics();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <LayoutDashboard className="mr-2 h-8 w-8" /> 
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {dashboardData?.user.name || currentUser?.displayName || 'User'}
          </p>
        </div>
      </div>
      
      {/* Stats Overview */}
      <StatsOverview stats={stats} />
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agreement Summary - spans 2 columns on medium screens and up */}
        <AgreementSummary 
          rentalAgreements={dashboardData?.rentalAgreements || []}
          loanAgreements={dashboardData?.loanAgreements || []}
        />
        
        {/* Sidebar - spans 1 column */}
        <div className="space-y-6">
          {/* Wallet Information */}
          <WalletInfo
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            isConnected={isConnected}
            onConnectWallet={handleConnectWallet}
          />
          
        </div>
      </div>
      
      {/* Recent Activity */}
      <RecentActivity payments={dashboardData?.recentPayments || []} />
    </div>
  );
};

export default Dashboard; 