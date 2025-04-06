import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Home } from 'lucide-react';

interface RentalAgreementDetailsCardProps {
  rentalAddress: string;
  rentalDetails: any;
  formatAddress: (address: string) => string;
  calculateMaxLoanAmount: () => string;
  calculateRemainingDuration: () => number;
  isSecurityDepositSufficient: (amount: string) => boolean;
  loanAmount: string;
}

const RentalAgreementDetailsCard: React.FC<RentalAgreementDetailsCardProps> = ({
  rentalAddress,
  rentalDetails,
  formatAddress,
  calculateMaxLoanAmount,
  calculateRemainingDuration,
  isSecurityDepositSufficient,
  loanAmount
}) => {
  return (
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
                    {loanAmount} ETH
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
                      isSecurityDepositSufficient(loanAmount)
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {isSecurityDepositSufficient(loanAmount)
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
  );
};

export default RentalAgreementDetailsCard; 