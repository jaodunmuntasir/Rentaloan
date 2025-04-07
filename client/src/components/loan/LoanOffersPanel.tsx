import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DollarSign, Loader2, CheckCircle, FileText, ExternalLink } from 'lucide-react';

interface LoanOffer {
  id: string;
  lenderId: string;
  lender?: {
    id: string;
    email?: string;
    walletAddress?: string;
  };
  interestRate: number;
  duration: number;
  amount?: string;
  status: string;
  createdAt: string;
  loanAgreementAddress?: string;
}

interface LoanOffersPanelProps {
  loanOffers: LoanOffer[];
  loanRequestStatus: string;
  formatAddress: (address: string) => string;
  formatTimeFromNow: (dateString: string) => string;
  calculateMonthlyPayment: (amount: string, interestRate: number, duration: number) => string;
  handleAcceptOffer: (offerId: string) => void;
  handleCreateLoanAgreement: (offerId: string) => void;
  handleViewLoanAgreement: (contractAddress: string) => void;
  processingAction: string | null;
  requestAmount: string;
}

const LoanOffersPanel: React.FC<LoanOffersPanelProps> = ({
  loanOffers,
  loanRequestStatus,
  formatAddress,
  formatTimeFromNow,
  calculateMonthlyPayment,
  handleAcceptOffer,
  handleCreateLoanAgreement,
  handleViewLoanAgreement,
  processingAction,
  requestAmount
}) => {
  return (
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
                    {offer.status === "REJECTED" && (
                      <Badge className="ml-2 bg-red-100 text-red-800">
                        Rejected
                      </Badge>
                    )}
                    {offer.status === "WITHDRAWN" && (
                      <Badge className="ml-2 bg-gray-100 text-gray-800">
                        Withdrawn
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
                        {offer.amount || requestAmount} ETH
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
                          offer.amount || requestAmount,
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
                  {/* Show Accept button for PENDING offers when request is OPEN */}
                  {offer.status === "PENDING" &&
                    loanRequestStatus === "OPEN" && (
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

                  {/* Show Create Loan Agreement button for ACCEPTED offers without loanAgreementAddress */}
                  {offer.status === "ACCEPTED" &&
                    !offer.loanAgreementAddress && (
                      <Button 
                        onClick={() => handleCreateLoanAgreement(offer.id)}
                        className="w-full"
                        disabled={processingAction !== null}
                      >
                        {processingAction ===
                        `creating-agreement-${offer.id}` ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Loan Agreement...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Create Loan Agreement
                          </>
                        )}
                      </Button>
                  )}

                  {/* Show View Loan Agreement button for offers with loanAgreementAddress */}
                  {offer.loanAgreementAddress && (
                    <Button 
                      onClick={() => handleViewLoanAgreement(offer.loanAgreementAddress!)}
                      className="w-full"
                      variant="outline"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Loan Agreement
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoanOffersPanel; 