import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { UserApi } from '../services/api.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  LayoutDashboard, 
  Wallet, 
  Building, 
  ArrowRight, 
  Loader2, 
  AlertTriangle, 
  Coins, 
  HomeIcon,
  RefreshCcw
} from 'lucide-react';

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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  // If wallet not connected, show connect prompt
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to RentLoan</CardTitle>
          <CardDescription>
            Connect your wallet to interact with smart contracts and manage your agreements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            RentLoan provides a secure, blockchain-based platform for rental agreements and loans
            secured by rental deposits. To get started, connect your wallet.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleConnectWallet}>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button asChild variant="default" className="justify-start" size="lg">
              <Link to="/rental/create">
                <Building className="h-4 w-4 mr-2" />
                Create Rental
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-start" size="lg">
              <Link to="/loan/request/create">
                <Coins className="h-4 w-4 mr-2" />
                Request Loan
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start sm:col-span-2" size="lg">
              <Link to="/loan/requests">
                <HomeIcon className="h-4 w-4 mr-2" />
                Browse Loan Requests
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>
              Your account information and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="font-medium text-muted-foreground">Name:</span>
              <span>{currentUser?.displayName || 'Not set'}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="font-medium text-muted-foreground">Email:</span>
              <span>{currentUser?.email}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="font-medium text-muted-foreground">Role:</span>
              <Badge variant="outline" className="w-fit">
                {dashboardData?.role || 'User'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Agreements */}
      <Card>
        <CardHeader>
          <CardTitle>Active Agreements</CardTitle>
          <CardDescription>
            Overview of your current rental and loan agreements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rental Agreements */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Building className="h-4 w-4 mr-2 text-muted-foreground" />
              Rental Agreements
            </h3>
            {dashboardData?.rentalAgreements && dashboardData.rentalAgreements.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.rentalAgreements.map((agreement) => (
                      <TableRow key={agreement.address}>
                        <TableCell className="font-medium">{agreement.propertyAddress}</TableCell>
                        <TableCell>{agreement.userRole}</TableCell>
                        <TableCell>{agreement.rentAmount} ETH</TableCell>
                        <TableCell>
                          <Badge variant={
                            agreement.status === 'Active' ? "default" : 
                            agreement.status === 'Pending' ? "outline" : 
                            "secondary"
                          }>
                            {agreement.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/rental/${agreement.address}`}>
                              <span>View</span>
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No rental agreements found.</p>
                <Button asChild variant="link" className="mt-2">
                  <Link to="/rental/create">Create your first rental agreement</Link>
                </Button>
              </div>
            )}
          </div>
          
          {/* Loan Agreements */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Coins className="h-4 w-4 mr-2 text-muted-foreground" />
              Loan Agreements
            </h3>
            {dashboardData?.loanAgreements && dashboardData.loanAgreements.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Related Rental</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.loanAgreements.map((agreement) => (
                      <TableRow key={agreement.address}>
                        <TableCell className="font-medium">{agreement.rentalAddress?.slice(0, 6)}...{agreement.rentalAddress?.slice(-4)}</TableCell>
                        <TableCell>{agreement.userRole}</TableCell>
                        <TableCell>{agreement.amount} ETH</TableCell>
                        <TableCell>
                          <Badge variant={
                            agreement.status === 'Active' ? "default" : 
                            agreement.status === 'Pending' ? "outline" : 
                            "secondary"
                          }>
                            {agreement.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/loan/agreement/${agreement.address}`}>
                              <span>View</span>
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No loan agreements found.</p>
                <Button asChild variant="link" className="mt-2">
                  <Link to="/loan/requests">Browse loan requests</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 