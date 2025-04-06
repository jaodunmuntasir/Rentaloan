import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LoanApi } from "../../services/api.service";
import CreateLoanOffer from "../../components/loan/CreateLoanOffer";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { 
  Loader2, 
  Home, 
  User, 
  Calendar, 
  Clock, 
  CreditCard, 
  DollarSign,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useRentalAgreement } from "../../hooks/useRentalAgreement";
import { useToast } from "../../contexts/ToastContext";
import { BlockchainService } from "../../services/blockchain.service";

// Types
interface Lender {
  id: string;
  email: string;
  walletAddress: string;
  name?: string;
}

interface LoanOffer {
  id: string;
  lenderId: string;
  lender?: Lender;
  interestRate: number;
  duration: number;
  amount?: string;
  status: string;
  createdAt: string;
}

interface LoanRequest {
  id: string;
  rentalAgreementId: string;
  rentalAgreement?: {
    contractAddress: string;
    name: string;
    baseRent: string;
    securityDeposit: string;
    duration: number;
    gracePeriod: number;
    landlord?: {
      id: string;
      email: string;
      walletAddress: string;
    };
    renter?: {
      id: string;
      email: string;
      walletAddress: string;
    };
  };
  requesterId: string;
  requester?: {
    id: string;
    email: string;
    walletAddress: string;
    name?: string;
  };
  amount: string;
  duration: number;
  interestRate: number;
  status: string;
  createdAt: string;
}

const LoanRequestDetail: React.FC = () => {
  // Get parameters from URL
  const { address: rentalAddress, id: requestId } = useParams<{
    address: string;
    id: string;
  }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Get rental agreement details directly from blockchain
  const {
    details: rentalDetails,
    loading: rentalLoading,
    error: rentalError,
  } = useRentalAgreement(rentalAddress || "");

  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [loanRequest, setLoanRequest] = useState<LoanRequest | null>(null);
  const [loanOffers, setLoanOffers] = useState<LoanOffer[]>([]);
  const [availableCollateral, setAvailableCollateral] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Helper function to determine if current user is the borrower
  const isUserBorrower = (): boolean => {
    if (!currentUser || !loanRequest) return false;

    // Check requester ID or email if available
    if (loanRequest.requester) {
      return loanRequest.requester.email === currentUser.email;
    }

    return false;
  };

  // Fetch collateral data from blockchain
  useEffect(() => {
    const fetchCollateralData = async () => {
      if (!rentalAddress) return;

      try {
        // Get available collateral info from blockchain
        const collateralInfo = await BlockchainService.getAvailableCollateral(
          rentalAddress
        );
        setAvailableCollateral(collateralInfo.availableAmount);
      } catch (err) {
        console.error("Error fetching collateral data:", err);
        // Set a default value for availableCollateral to prevent UI issues
        setAvailableCollateral("0");
      }
    };

    fetchCollateralData();
  }, [rentalAddress]);

  // Fetch loan request details
  useEffect(() => {
    const fetchLoanRequest = async () => {
      if (!requestId) {
        setError("Loan request ID is missing from URL parameters");
        setLoading(false);
        return;
      }

      if (!currentUser) {
        setError("You must be logged in to view loan request details");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        // Convert Firebase User to App User
        const appUser = {
          id: currentUser.uid,
          email: currentUser.email || "",
          name: currentUser.displayName || "",
          walletAddress: null,
          token: await currentUser.getIdToken(true), // Force token refresh
        };

        console.log("Fetching loan request with ID:", requestId);

        // Fetch loan request details from API
        const response = await LoanApi.getLoanRequest(appUser, requestId);

        if (response && response.success && response.loanRequest) {
          setLoanRequest(response.loanRequest);
          setLoanOffers(response.loanOffers || []);
          // We'll get availableCollateral from blockchain directly
        } else {
          const errorMessage =
            response.error || "Failed to load loan request data";
          console.error("Loan request fetch failed:", errorMessage);
          setError(errorMessage);
        }
      } catch (err: any) {
        console.error("Unexpected error fetching loan request:", err);
        setError(
          err.message ||
            "An unexpected error occurred while fetching loan request details"
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoanRequest();
  }, [requestId, currentUser]);
  
  // Calculate monthly payment for a given interest rate and duration
  const calculateMonthlyPayment = (
    amount: string,
    interestRate: number,
    duration: number
  ): string => {
    const principal = parseFloat(amount);
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = duration;
    
    if (principal <= 0 || interestRate <= 0 || numberOfPayments <= 0) {
      return "0";
    }
    
    // Monthly payment formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const payment = 
      (principal *
      monthlyInterestRate * 
        Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    return payment.toFixed(6);
  };

  // Calculate maximum loan amount based on the dueAmount plus current month's rent (same as RequestCreate)
  const calculateMaxLoanAmount = (): string => {
    if (
      !rentalDetails ||
      (!rentalDetails.dueAmount && !rentalDetails.rentAmount)
    )
      return "0";

    // Add the due amount and the current month's base rent
    const dueAmount = parseFloat(rentalDetails.dueAmount || "0");
    const baseRent = parseFloat(rentalDetails.rentAmount || "0");
    const maxAmount = dueAmount + baseRent;

    return maxAmount.toString();
  };

  // Calculate remaining rental duration minus 1 (same as RequestCreate)
  const calculateRemainingDuration = (): number => {
    if (
      !rentalDetails ||
      !rentalDetails.rentDuration ||
      rentalDetails.lastPaidMonth === undefined
    )
      return 0;

    // Remaining duration is total duration minus last paid month minus 1
    const remainingMonths = Math.max(
      0,
      rentalDetails.rentDuration - rentalDetails.lastPaidMonth - 1
    );

    return remainingMonths;
  };

  // Check if the security deposit is sufficient for the requested loan amount (same as RequestCreate)
  const isSecurityDepositSufficient = (loanAmount: string): boolean => {
    if (!rentalDetails || !rentalDetails.currentSecurityDeposit) return false;

    const currentSecurityDeposit = parseFloat(
      rentalDetails.currentSecurityDeposit
    );
    const requestedAmount = parseFloat(loanAmount);

    return currentSecurityDeposit >= requestedAmount;
  };
  
  // Format address for display (e.g. 0x1234...5678)
  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };
  
  // Format time from now (e.g. "3 days ago")
  const formatTimeFromNow = (dateString: string) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return `${diffDays} days ago`;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Open
          </Badge>
        );
      case "MATCHED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Matched
          </Badge>
        );
      case "FULFILLED":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            Fulfilled
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Closed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Cancelled
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Accepted
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Handle offer submission
  const handleOfferSubmit = async (interestRate: number, duration: number, amount: string) => {
    if (!currentUser || !loanRequest) return;
    
    try {
      setProcessingAction('submitting-offer');
      
      // Convert Firebase User to App User
      const appUser = {
        id: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || '',
        walletAddress: null,
        token: await currentUser.getIdToken()
      };
      
      // Submit offer via API
      const response = await LoanApi.createLoanOffer(appUser, {
        requestId: loanRequest.id,
        interestRate,
        offerAmount: amount
      });
      
      if (response && response.loanOffer) {
        showToast('Loan offer created successfully!', 'success');
        
        // Refresh the entire page to show updated data
        window.location.reload();
      } else {
        showToast('Failed to create loan offer', 'error');
      }
    } catch (err) {
      console.error("Error creating loan offer:", err);
      showToast('Failed to create loan offer', 'error');
    } finally {
      setProcessingAction(null);
    }
  };
  
  // Handle accept offer
  const handleAcceptOffer = async (offerId: string) => {
    if (!currentUser || !loanRequest) return;

    try {
      setProcessingAction(`accepting-${offerId}`);

      // Convert Firebase User to App User
      const appUser = {
        id: currentUser.uid,
        email: currentUser.email || "",
        name: currentUser.displayName || "",
        walletAddress: null,
        token: await currentUser.getIdToken(),
      };

      // Accept offer via API
      const response = await LoanApi.acceptLoanOffer(appUser, offerId);

      if (response && response.loanAgreement) {
        showToast("Loan offer accepted successfully!", "success");

        // Navigate to the loan agreement details
        navigate(`/loan/agreement/${response.loanAgreement.contractAddress}`);
      } else {
        showToast("Failed to accept loan offer", "error");

        // Refresh data
        const updatedData = await LoanApi.getLoanRequest(
          appUser,
          loanRequest.id
        );
        setLoanRequest(updatedData.loanRequest);
        setLoanOffers(updatedData.loanOffers || []);
      }
    } catch (err) {
      console.error("Error accepting loan offer:", err);
      showToast("Failed to accept loan offer", "error");
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle withdraw offer
  const handleWithdrawOffer = async (offerId: string) => {
    if (!currentUser) return;

    try {
      setProcessingAction(`withdrawing-${offerId}`);

      // Convert Firebase User to App User
      const appUser = {
        id: currentUser.uid,
        email: currentUser.email || "",
        name: currentUser.displayName || "",
        walletAddress: null,
        token: await currentUser.getIdToken(),
      };

      // Withdraw offer via API
      const response = await LoanApi.withdrawLoanOffer(appUser, offerId);

      if (response && response.success) {
        showToast("Loan offer withdrawn successfully!", "success");

        // Refresh data
        const updatedData = await LoanApi.getLoanRequest(
          appUser,
          loanRequest!.id
        );
        setLoanOffers(updatedData.loanOffers || []);
      } else {
        showToast("Failed to withdraw loan offer", "error");
      }
    } catch (err) {
      console.error("Error withdrawing loan offer:", err);
      showToast("Failed to withdraw loan offer", "error");
    } finally {
      setProcessingAction(null);
    }
  };

  // Check if user has already made an offer
  const userHasOffer = (): boolean => {
    if (!currentUser || !loanOffers.length) return false;

    return loanOffers.some(
      (offer) =>
        offer.lender?.email === currentUser.email ||
        offer.lender?.id === currentUser.uid
    );
  };

  // Get user's offer
  const getUserOffer = () => {
    if (!currentUser || !loanOffers.length) return null;

    return loanOffers.find(
      (offer) =>
        offer.lender?.email === currentUser.email ||
        offer.lender?.id === currentUser.uid
    );
  };

  if (loading || rentalLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading loan request details...</p>
      </div>
    );
  }
  
  if (error || !loanRequest) {
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto">
        <AlertTitle>Error Loading Loan Request</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{error || "Failed to load loan request details"}</p>

          <div className="bg-gray-100 p-4 rounded-md text-sm my-4">
            <p className="font-semibold">Troubleshooting Information:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Loan Request ID: {requestId}</li>
              <li>Rental Address: {rentalAddress}</li>
              <li>User Logged In: {currentUser ? "Yes" : "No"}</li>
              <li>
                Blockchain Data Loading:{" "}
                {rentalLoading
                  ? "In Progress"
                  : rentalDetails
                  ? "Successful"
                  : "Failed"}
              </li>
            </ul>

            <p className="mt-4">Please try the following:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Refresh the page</li>
              <li>
                Check that the loan request exists and is associated with this
                rental address
              </li>
              <li>Verify your permissions to access this loan request</li>
            </ul>
          </div>

          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>

            <Button variant="default" onClick={() => window.location.reload()}>
              <Loader2 className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <h1 className="text-3xl font-bold tracking-tight">
            Loan Request Details
          </h1>
          <p className="text-muted-foreground mt-1">
            {loanRequest.rentalAgreement?.name ||
              rentalDetails?.name ||
              `Rental Agreement #${loanRequest.rentalAgreementId}`}{" "}
            - {getStatusBadge(loanRequest.status)}
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="terms">Loan Terms</TabsTrigger>
          {isUserBorrower() ? (
            <TabsTrigger value="offers">Offers</TabsTrigger>
          ) : (
            <TabsTrigger value="make-offer">Make an Offer</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="details" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" /> Rental Agreement Details
              </CardTitle>
                <CardDescription>
                  Details of the associated rental agreement
                </CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Rental Agreement</h4>
                  <div className="flex items-center">
                    <Home className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>
                      {rentalDetails
                        ? `${
                            rentalDetails.name || "Rental Agreement"
                          } (${formatAddress(rentalAddress || "")})`
                        : formatAddress(rentalAddress || "")}
                    </span>
                  </div>
                </div>
                
                {/* Blockchain rental details - Use data directly from blockchain */}
                {rentalDetails && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-medium">Rental Agreement Details</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Rent Amount:
                          </span>
                          <span className="font-medium">
                            {rentalDetails.rentAmount} ETH
                          </span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Current Security Deposit:
                          </span>
                          <span className="font-medium">
                            {rentalDetails.currentSecurityDeposit} ETH
                          </span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Possible Collateral:
                          </span>
                          <span className="font-medium">
                            {calculateMaxLoanAmount()} ETH
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Due Amount:
                          </span>
                          <span className="font-medium">
                            {loanRequest.amount} ETH
                          </span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Possible Loan Duration:
                          </span>
                        <span className="font-medium">
                            {calculateRemainingDuration()} months
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Security Deposit Sufficient:
                          </span>
                          <span
                            className={`font-medium ${
                              isSecurityDepositSufficient(
                                loanRequest?.amount || "0"
                              )
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {isSecurityDepositSufficient(
                              loanRequest?.amount || "0"
                            )
                              ? "Yes"
                              : "No"}
                        </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4"></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" /> Borrower Information
                </CardTitle>
                <CardDescription>Details of the loan requester</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {loanRequest.requester?.email || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Wallet Address</p>
                  <p className="text-sm text-muted-foreground">
                    {formatAddress(loanRequest.requester?.walletAddress || "")}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Request Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(loanRequest.createdAt).toLocaleDateString()} (
                    {formatTimeFromNow(loanRequest.createdAt)})
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="terms" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" /> Loan Terms
              </CardTitle>
              <CardDescription>
                Financial details of the loan request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Requested Amount</p>
                  <p className="text-xl font-semibold">
                    {loanRequest.amount} ETH
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-xl font-semibold">
                    {loanRequest.duration} months
                  </p>
                  </div>
                  
                <div>
                  <p className="text-sm font-medium">Interest Rate</p>
                  <p className="text-xl font-semibold">
                    {loanRequest.interestRate}%
                  </p>
                      </div>
                      </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Loan Terms</p>
                <div className="bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Estimated Monthly Payment
                      </p>
                      <p className="font-medium">
                        {calculateMonthlyPayment(
                          loanRequest.amount,
                          loanRequest.interestRate,
                          loanRequest.duration
                        )}{" "}
                        ETH
                      </p>
                      </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Payment
                      </p>
                      <p className="font-medium">
                        {(
                          parseFloat(loanRequest.amount) *
                          (1 + loanRequest.interestRate / 100)
                        ).toFixed(6)}{" "}
                        ETH
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isUserBorrower() ? (
          <TabsContent value="offers" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" /> Loan Offers
              </CardTitle>
              <CardDescription>
                  Offers from lenders for your loan request
              </CardDescription>
            </CardHeader>
            <CardContent>
                {loanOffers.length === 0 ? (
                  <div className="text-center p-6">
                    <p className="text-muted-foreground">
                      No offers yet. Check back later.
                    </p>
                </div>
              ) : (
                <div className="space-y-4">
                    {loanOffers.map((offer) => (
                      <Card
                        key={offer.id}
                        className={`border ${
                          offer.status === "ACCEPTED" ? "border-green-500" : ""
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            Offer from{" "}
                            {offer.lender?.email ||
                              formatAddress(offer.lender?.walletAddress || "")}
                            {offer.status === "ACCEPTED" && (
                              <Badge className="ml-2 bg-green-100 text-green-800">
                                Accepted
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                              <p className="text-xs text-muted-foreground">
                                Interest Rate
                              </p>
                              <p className="font-medium">
                                {offer.interestRate}%
                            </p>
                          </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Duration
                              </p>
                              <p className="font-medium">
                                {offer.duration} months
                              </p>
                          </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Loan Amount
                              </p>
                              <p className="font-medium">
                                {offer.amount} ETH
                              </p>
                          </div>
                        </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Monthly Payment
                              </p>
                              <p className="font-medium">
                                {calculateMonthlyPayment(
                                  offer.amount || loanRequest.amount,
                                  offer.interestRate,
                                  offer.duration
                                )}{" "}
                                ETH
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Offered {formatTimeFromNow(offer.createdAt)}
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          {offer.status === "PENDING" &&
                            loanRequest.status === "OPEN" && (
                            <Button 
                              onClick={() => handleAcceptOffer(offer.id)}
                                className="w-full"
                                disabled={processingAction !== null}
                              >
                                {processingAction ===
                                `accepting-${offer.id}` ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                              Accept Offer
                                  </>
                                )}
                            </Button>
                        )}
                        </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ) : (
          <TabsContent value="make-offer" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" /> Make a Loan Offer
                </CardTitle>
                <CardDescription>
                  Provide an interest rate for your loan offer. The loan amount and duration are fixed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userHasOffer() ? (
                  <div className="space-y-4">
            <Alert>
                      <AlertTitle className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        You have already made an offer
                      </AlertTitle>
              <AlertDescription>
                        You have already submitted an offer for this loan
                        request. You cannot edit your offer, but you can
                        withdraw it if it hasn't been accepted yet.
              </AlertDescription>
            </Alert>

                    {getUserOffer() && (
                      <Card className="border border-muted">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Your Offer</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Interest Rate
                              </p>
                              <p className="font-medium">
                                {getUserOffer()?.interestRate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Duration
                              </p>
                              <p className="font-medium">
                                {getUserOffer()?.duration || loanRequest.duration} months
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Loan Amount
                              </p>
                              <p className="font-medium">
                                {getUserOffer()?.amount || loanRequest.amount} ETH
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Status
                              </p>
                              <p className="font-medium">
                                {getStatusBadge(getUserOffer()?.status || "")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          {getUserOffer()?.status === "PENDING" && (
                            <Button
                              variant="destructive"
                              onClick={() =>
                                handleWithdrawOffer(getUserOffer()?.id || "")
                              }
                              disabled={processingAction !== null}
                            >
                              {processingAction ===
                              `withdrawing-${getUserOffer()?.id}` ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Withdraw Offer
                                </>
                              )}
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    )}
                  </div>
                ) : loanRequest.status !== "OPEN" ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>This loan request is no longer open</AlertTitle>
              <AlertDescription>
                      You cannot make an offer for this loan request as it has
                      already been fulfilled or closed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mt-8">
            <CreateLoanOffer 
                requestData={{
                  amount: loanRequest.amount,
                  interestRate: loanRequest.interestRate,
                  duration: loanRequest.duration
                }}
                possibleLoanDuration={calculateRemainingDuration()}
                isSubmitting={processingAction === 'submitting-offer'}
              onSubmit={handleOfferSubmit}
            />
            </div>
          )}
              </CardContent>
            </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LoanRequestDetail; 
