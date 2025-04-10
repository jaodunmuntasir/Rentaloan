import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { 
  Loader2, 
  Search, 
  AlertCircle,
  CreditCard,
  Wallet,
  ExternalLink,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { LoanApi } from "../../services/api.service";
import {
  LoanStatus,
  LoanStatusLabels,
} from "../../services/loan-agreement.service";
import { ethers } from "ethers";

// Define types for loan agreement
interface LoanAgreement {
  contractAddress: string;
  borrower: {
    id: string;
    email: string;
    walletAddress: string;
  };
  lender: {
    id: string;
    email: string;
    walletAddress: string;
  };
  loanRequest: {
    id: string;
    rentalAgreement: {
      id: string;
      propertyAddress: string;
    };
  };
  loanOffer: {
    id: string;
  };
  amount: string;
  interestRate: number;
  duration: number;
  graceMonths: number;
  status: number;
  statusText?: string;
  startDate: string;
  paymentsMade?: number;
  totalPayments?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: string;
  payments?: any[];
  repaymentSchedule?: any[];
  monthlyPayment?: string;
  collateralAmount?: string;
}

const LoanAgreementList: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"borrower" | "lender" | "all">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<LoanAgreement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  useEffect(() => {
    const fetchAgreements = async () => {
      if (!currentUser) {
        setLoading(false);
        setError("You must be logged in to view loan agreements");
        return;
      }

      try {
        setLoading(true);
        // Convert Firebase user to User type
        const userForApi = {
          id: currentUser.uid,
          email: currentUser.email || "",
          name: currentUser.displayName || "",
          walletAddress: null,
          token: await currentUser.getIdToken(),
        };
        
        const response = await LoanApi.getLoanAgreements(userForApi);

        // Process the agreements to add statusText and calculate payments information
        const processedAgreements = await Promise.all(
          (response.loanAgreements || []).map(
            async (agreement: LoanAgreement) => {
              // Get wallet provider from your wallet context or create one
              const provider = new ethers.JsonRpcProvider(
                "http://127.0.0.1:8545"
              );

              try {
                // Get loan agreement contract
                const loanAgreementABI = [
                  "function getStatus() external view returns (uint8)",
                  "function monthlyPayment() external view returns (uint256)",
                  "function collateralAmount() external view returns (uint256)",
                  "function borrower() external view returns (address)",
                  "function lender() external view returns (address)",
                ];

                const contract = new ethers.Contract(
                  agreement.contractAddress,
                  loanAgreementABI,
                  provider
                );

                // Fetch blockchain status, monthly payment and collateral
                const [
                  status,
                  monthlyPayment,
                  collateralAmount,
                  borrowerAddress,
                  lenderAddress,
                ] = await Promise.all([
                  contract.getStatus(),
                  contract.monthlyPayment(),
                  contract.collateralAmount(),
                  contract.borrower(),
                  contract.lender(),
                ]);

                // Add human-readable status text
                const statusValue = Number(status) as LoanStatus;
                const statusText = LoanStatusLabels[statusValue] || "Unknown";

                return {
                  ...agreement,
                  status: statusValue,
                  statusText,
                  monthlyPayment: ethers.formatEther(monthlyPayment),
                  collateralAmount: ethers.formatEther(collateralAmount),
                  // Make sure wallet addresses match for proper role detection
                  borrower: {
                    ...agreement.borrower,
                    walletAddress: borrowerAddress,
                  },
                  lender: {
                    ...agreement.lender,
                    walletAddress: lenderAddress,
                  },
                };
              } catch (error) {
                console.error(
                  `Error fetching blockchain data for ${agreement.contractAddress}:`,
                  error
                );
                // Return agreement with default values if blockchain query fails
                return {
                  ...agreement,
                  statusText:
                    LoanStatusLabels[agreement.status as LoanStatus] ||
                    "Unknown",
                  monthlyPayment: "Unknown",
                  collateralAmount: "Unknown",
                };
              }
            }
          )
        );

        setAgreements(processedAgreements);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching loan agreements:", err);
        setError(err.message || "Failed to load loan agreements");
        setLoading(false);
      }
    };
    
    fetchAgreements();
  }, [currentUser]);
  
  // Format wallet address for display
  const formatAddress = (address: string): string => {
    if (!address) return "N/A";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };
  
  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  
  // Calculate days until next payment
  const calculateDaysUntilPayment = (
    nextPaymentDue: string | null | undefined
  ): string => {
    if (!nextPaymentDue) return "N/A";
    
    const now = new Date();
    const paymentDate = new Date(nextPaymentDue);
    const diffTime = paymentDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  };
  
  // Get status badge
  const getStatusBadge = (status: number) => {
    switch (status) {
      case LoanStatus.INITIALIZED:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Initialized
          </Badge>
        );
      case LoanStatus.READY:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Ready
          </Badge>
        );
      case LoanStatus.ACTIVE:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Active
          </Badge>
        );
      case LoanStatus.PAID:
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            Paid
          </Badge>
        );
      case LoanStatus.COMPLETED:
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Completed
          </Badge>
        );
      case LoanStatus.DEFAULTED:
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Defaulted
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Check if an agreement is past due
  const isPastDue = (agreement: LoanAgreement): boolean => {
    if (!agreement.nextPaymentDate) return false;
    
    const now = new Date();
    const nextPayment = new Date(agreement.nextPaymentDate);
    return nextPayment < now;
  };
  
  // Filter agreements based on tab, search, and status filter
  const getFilteredAgreements = () => {
    return agreements.filter((agreement) => {
        // Filter by tab
      if (
        activeTab === "borrower" &&
        currentUser?.uid !== agreement.borrower.id
      )
        return false;
      if (activeTab === "lender" && currentUser?.uid !== agreement.lender.id)
        return false;

      // Filter by status - convert to number if needed
      if (statusFilter !== "all") {
        // Convert string to number for comparison
        const filterStatusNumber = parseInt(statusFilter);
        if (!isNaN(filterStatusNumber) && filterStatusNumber >= 0) {
          return agreement.status === filterStatusNumber;
        }
        return false; // If we can't parse the status filter, exclude this item
      }
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            agreement.contractAddress.toLowerCase().includes(query) ||
          (agreement.loanRequest.rentalAgreement.propertyAddress || "")
            .toLowerCase()
            .includes(query) ||
          agreement.amount.includes(query) ||
          (agreement.statusText || "").toLowerCase().includes(query)
          );
        }
        
        return true;
      });
  };
  
  const filteredAgreements = getFilteredAgreements();
  
  // Navigate to loan agreement detail
  const handleViewAgreement = (address: string) => {
    navigate(`/loan/agreement/${address}`);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading loan agreements...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-destructive h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Loan Agreements</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your loan agreements
          </p>
        </div>
        <Button onClick={() => navigate("/loan/requests")}>
          <Banknote className="mr-2 h-4 w-4" />
          View Loan Requests
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" /> Loan Agreements
          </CardTitle>
          <CardDescription>
            All your active and completed loan agreements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={(value: string) =>
              setActiveTab(value as "borrower" | "lender" | "all")
            }
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="all">All Agreements</TabsTrigger>
                <TabsTrigger value="borrower">As Borrower</TabsTrigger>
                <TabsTrigger value="lender">As Lender</TabsTrigger>
              </TabsList>
              
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search agreements..."
                    className="pl-8 w-full md:w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={String(LoanStatus.INITIALIZED)}>
                      Initialized
                    </SelectItem>
                    <SelectItem value={String(LoanStatus.READY)}>
                      Ready
                    </SelectItem>
                    <SelectItem value={String(LoanStatus.ACTIVE)}>
                      Active
                    </SelectItem>
                    <SelectItem value={String(LoanStatus.PAID)}>
                      Paid
                    </SelectItem>
                    <SelectItem value={String(LoanStatus.COMPLETED)}>
                      Completed
                    </SelectItem>
                    <SelectItem value={String(LoanStatus.DEFAULTED)}>
                      Defaulted
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="all" className="m-0">
              {filteredAgreements.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">
                    No loan agreements found
                  </h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters to see more results"
                      : "You don't have any loan agreements yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgreements.map((agreement) => (
                    <div 
                      key={agreement.contractAddress}
                      className="rounded-lg border p-4 hover:border-primary cursor-pointer transition-colors"
                      onClick={() =>
                        handleViewAgreement(agreement.contractAddress)
                      }
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              Contract:{" "}
                              {formatAddress(agreement.contractAddress)}
                            </h3>
                            {getStatusBadge(agreement.status)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {agreement.amount} ETH
                            </p>
                            <p className="text-sm text-muted-foreground">
                              at {agreement.interestRate}% interest
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Role</p>
                          <p className="font-medium">
                            {currentUser?.uid === agreement.borrower.id
                              ? "Borrower"
                              : "Lender"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Monthly Payment
                          </p>
                          <p className="font-medium">
                            {agreement.monthlyPayment} ETH
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Collateral Amount
                          </p>
                          <p className="font-medium">
                            {agreement.collateralAmount} ETH
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="borrower" className="m-0">
              {filteredAgreements.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">
                    No borrower loan agreements found
                  </h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters to see more results"
                      : "You don't have any loan agreements as a borrower yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgreements.map((agreement) => (
                    <div
                      key={agreement.contractAddress}
                      className="rounded-lg border p-4 hover:border-primary cursor-pointer transition-colors"
                      onClick={() =>
                        handleViewAgreement(agreement.contractAddress)
                      }
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              Contract:{" "}
                              {formatAddress(agreement.contractAddress)}
                            </h3>
                            {getStatusBadge(agreement.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Rental:{" "}
                            {agreement.loanRequest.rentalAgreement
                              .propertyAddress ||
                              "Property Address Not Available"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {agreement.amount} ETH
                            </p>
                            <p className="text-sm text-muted-foreground">
                              at {agreement.interestRate}% interest
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Role</p>
                          <p className="font-medium">Borrower</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Monthly Payment
                          </p>
                          <p className="font-medium">
                            {agreement.monthlyPayment} ETH
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Collateral Amount
                          </p>
                          <p className="font-medium">
                            {agreement.collateralAmount} ETH
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="lender" className="m-0">
              {filteredAgreements.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">
                    No lender loan agreements found
                  </h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters to see more results"
                      : "You don't have any loan agreements as a lender yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgreements.map((agreement) => (
                    <div
                      key={agreement.contractAddress}
                      className="rounded-lg border p-4 hover:border-primary cursor-pointer transition-colors"
                      onClick={() =>
                        handleViewAgreement(agreement.contractAddress)
                      }
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              Contract:{" "}
                              {formatAddress(agreement.contractAddress)}
                            </h3>
                            {getStatusBadge(agreement.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Rental:{" "}
                            {agreement.loanRequest.rentalAgreement
                              .propertyAddress ||
                              "Property Address Not Available"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {agreement.amount} ETH
                            </p>
                            <p className="text-sm text-muted-foreground">
                              at {agreement.interestRate}% interest
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Role</p>
                          <p className="font-medium">Lender</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Monthly Payment
                          </p>
                          <p className="font-medium">
                            {agreement.monthlyPayment} ETH
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Collateral Amount
                          </p>
                          <p className="font-medium">
                            {agreement.collateralAmount} ETH
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanAgreementList; 
