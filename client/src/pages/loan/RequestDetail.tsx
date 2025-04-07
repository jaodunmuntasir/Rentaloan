import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LoanApi } from "../../services/api.service";
import { useRentalAgreement } from "../../hooks/useRentalAgreement";
import { useToast } from "../../contexts/ToastContext";
import { BlockchainService } from "../../services/blockchain.service";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";

// Import our new components
import RequestDetailHeader from "../../components/loan/RequestDetailHeader";
import RentalAgreementDetailsCard from "../../components/loan/RentalAgreementDetailsCard";
import BorrowerInfoCard from "../../components/loan/BorrowerInfoCard";
import LoanTermsCard from "../../components/loan/LoanTermsCard";
import LoanOffersPanel from "../../components/loan/LoanOffersPanel";
import MakeOfferPanel from "../../components/loan/MakeOfferPanel";
import ErrorDisplay from "../../components/loan/ErrorDisplay";
import LoadingDisplay from "../../components/loan/LoadingDisplay";

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
  loanAgreementAddress?: string;
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

  // Helper to create App User from Firebase User for API calls
  const createAppUser = async () => {
    if (!currentUser) return null;
    
    return {
      id: currentUser.uid,
      email: currentUser.email || "",
      name: currentUser.displayName || "",
      walletAddress: null,
      token: await currentUser.getIdToken(true), // Force token refresh
    };
  };

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
        // Don't set an error state as this is not critical - we can still show the page
        showToast("Could not fetch collateral data from blockchain. Using default values.", "warning");
      }
    };

    fetchCollateralData();
  }, [rentalAddress, showToast]);

  // Fetch loan request details
  const fetchLoanRequestData = async () => {
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

      // Create App User for API call
      const appUser = await createAppUser();
      if (!appUser) {
        throw new Error("Failed to create app user");
      }

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

  // Initial data fetch
  useEffect(() => {
    fetchLoanRequestData();
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

  // Calculate maximum loan amount based on the dueAmount plus current month's rent
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

  // Calculate remaining rental duration minus 1
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

  // Check if the security deposit is sufficient for the requested loan amount
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
      const appUser = await createAppUser();
      if (!appUser) {
        throw new Error("Failed to create app user");
      }
      
      // Ensure interest rate is an integer for blockchain compatibility
      const interestRateInt = Math.round(interestRate);
      
      // Submit offer via API
      const response = await LoanApi.createLoanOffer(appUser, {
        requestId: loanRequest.id,
        interestRate: interestRateInt,
        offerAmount: amount
      });
      
      if (response && response.loanOffer) {
        showToast('Loan offer created successfully!', 'success');
        
        // Refresh the data
        await fetchLoanRequestData();
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
  
  // Handle accepting an offer (database only)
  const handleAcceptOffer = async (offerId: string) => {
    if (!currentUser || !loanRequest) return;

    try {
      setProcessingAction(`accepting-${offerId}`);
      
      // Create App User for API call
      const appUser = await createAppUser();
      if (!appUser) {
        throw new Error("Failed to create app user");
      }

      // Accept offer in the database
      const acceptResponse = await LoanApi.acceptLoanOffer(appUser, offerId);
      if (!acceptResponse.success) {
        throw new Error(acceptResponse.error || "Failed to accept offer in database");
      }

      showToast("Offer accepted successfully!", "success");
      
      // Refresh data to get updated offer statuses
      await fetchLoanRequestData();
    } catch (err) {
      console.error("Error accepting loan offer:", err);
      showToast("Failed to accept loan offer", "error");
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle creating loan agreement (blockchain)
  const handleCreateLoanAgreement = async (offerId: string) => {
    if (!currentUser || !loanRequest || !rentalAddress) return;

    try {
      setProcessingAction(`creating-agreement-${offerId}`);
      showToast("Creating loan agreement on blockchain...", "info");

      // Find the offer to use
      const offerToUse = loanOffers.find(offer => offer.id === offerId);
      if (!offerToUse) {
        throw new Error("Offer not found");
      }

      console.log("Creating loan agreement with offer:", {
        offerId,
        lender: offerToUse.lender?.walletAddress,
        rentalAddress,
        amount: offerToUse.amount || loanRequest.amount,
        interestRate: offerToUse.interestRate,
        duration: offerToUse.duration
      });

      // Create App User for API call
      const appUser = await createAppUser();
      if (!appUser) {
        throw new Error("Failed to create app user");
      }

      // Create the loan agreement contract on the blockchain
      try {
        // Ensure amount is a string
        const amount = (offerToUse.amount || loanRequest.amount).toString();
        
        const loanAgreementResult = await BlockchainService.createLoanAgreement(
          offerToUse.lender?.walletAddress || "", // lender address
          rentalAddress, // rental contract address
          amount, // loan amount as string
          offerToUse.interestRate, // interest rate
          offerToUse.duration, // duration
          1 // grace months (hardcoded to 1 for now)
        );

        showToast("Loan agreement created on blockchain!", "success");
        console.log("Loan agreement created:", loanAgreementResult);

        // Register the contract address in our database
        const registerResponse = await LoanApi.registerLoanAgreement(appUser, {
          offerId,
          contractAddress: loanAgreementResult.contractAddress,
          transactionHash: loanAgreementResult.transactionHash
        });

        if (!registerResponse.success) {
          throw new Error(registerResponse.error || "Failed to register loan agreement in database");
        }

        showToast("Loan agreement registered successfully!", "success");
        
        // Update the offer in the state with the new loan agreement address
        setLoanOffers(prevOffers => 
          prevOffers.map(offer => 
            offer.id === offerId 
              ? { ...offer, loanAgreementAddress: loanAgreementResult.contractAddress } 
              : offer
          )
        );
      } catch (blockchainError) {
        console.error("Blockchain error:", blockchainError);
        throw new Error(blockchainError instanceof Error 
          ? `Blockchain error: ${blockchainError.message}`
          : "Unknown blockchain error");
      }
    } catch (err) {
      console.error("Error creating loan agreement:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showToast(`Failed to create loan agreement: ${errorMessage}`, "error");
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle navigating to loan agreement details
  const handleViewLoanAgreement = (contractAddress: string) => {
    navigate(`/loan/agreement/${contractAddress}`);
  };

  // Handle withdraw offer
  const handleWithdrawOffer = async (offerId: string) => {
    if (!currentUser) return;

    try {
      setProcessingAction(`withdrawing-${offerId}`);

      // Create App User for API call
      const appUser = await createAppUser();
      if (!appUser) {
        throw new Error("Failed to create app user");
      }

      // Withdraw offer via API
      const response = await LoanApi.withdrawLoanOffer(appUser, offerId);

      if (response && response.success) {
        showToast("Loan offer withdrawn successfully!", "success");

        // Refresh data
        await fetchLoanRequestData();
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
  const getUserOffer = (): LoanOffer | null => {
    if (!currentUser || !loanOffers.length) return null;

    const userOffer = loanOffers.find(
      (offer) =>
        offer.lender?.email === currentUser.email ||
        offer.lender?.id === currentUser.uid
    );
    
    return userOffer || null;
  };

  if (loading || rentalLoading) {
    return <LoadingDisplay />;
  }
  
  if (error || !loanRequest) {
    return (
      <ErrorDisplay 
        error={error}
        requestId={requestId}
        rentalAddress={rentalAddress}
        isUserLoggedIn={!!currentUser}
        isBlockchainDataLoading={rentalLoading}
        hasBlockchainData={!!rentalDetails}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      <RequestDetailHeader 
        title="Loan Request Details"
        rentalAgreementName={loanRequest.rentalAgreement?.name || 
          rentalDetails?.name || 
          `Rental Agreement #${loanRequest.rentalAgreementId}`}
        status={loanRequest.status}
        statusBadge={getStatusBadge(loanRequest.status)}
      />
      
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
            <RentalAgreementDetailsCard 
              rentalAddress={rentalAddress || ""}
              rentalDetails={rentalDetails}
              formatAddress={formatAddress}
              calculateMaxLoanAmount={calculateMaxLoanAmount}
              calculateRemainingDuration={calculateRemainingDuration}
              isSecurityDepositSufficient={isSecurityDepositSufficient}
              loanAmount={loanRequest.amount}
            />

            <BorrowerInfoCard 
              borrower={loanRequest.requester || {}}
              formatAddress={formatAddress}
              formatTimeFromNow={formatTimeFromNow}
              requestCreatedAt={loanRequest.createdAt}
            />
              </div>
        </TabsContent>
        
        <TabsContent value="terms" className="space-y-4 pt-4">
          <LoanTermsCard 
            amount={loanRequest.amount}
            duration={loanRequest.duration}
            interestRate={loanRequest.interestRate}
            calculateMonthlyPayment={calculateMonthlyPayment}
          />
        </TabsContent>
        
        {isUserBorrower() ? (
          <TabsContent value="offers" className="space-y-4 pt-4">
            <LoanOffersPanel 
              loanOffers={loanOffers}
              loanRequestStatus={loanRequest.status}
              formatAddress={formatAddress}
              formatTimeFromNow={formatTimeFromNow}
              calculateMonthlyPayment={calculateMonthlyPayment}
              handleAcceptOffer={handleAcceptOffer}
              handleCreateLoanAgreement={handleCreateLoanAgreement}
              handleViewLoanAgreement={handleViewLoanAgreement}
              processingAction={processingAction}
              requestAmount={loanRequest.amount}
            />
          </TabsContent>
        ) : (
          <TabsContent value="make-offer" className="space-y-4 pt-4">
            <MakeOfferPanel 
              userHasOffer={userHasOffer()}
              loanRequestStatus={loanRequest.status}
              userOffer={getUserOffer()}
              loanRequestAmount={loanRequest.amount}
              loanRequestInterestRate={loanRequest.interestRate}
              loanRequestDuration={loanRequest.duration}
              possibleLoanDuration={calculateRemainingDuration()}
              processingAction={processingAction}
              handleWithdrawOffer={handleWithdrawOffer}
              handleOfferSubmit={handleOfferSubmit}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LoanRequestDetail; 
