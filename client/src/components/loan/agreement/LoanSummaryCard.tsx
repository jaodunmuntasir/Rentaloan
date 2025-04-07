import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { CreditCard } from 'lucide-react';
import LoanStatusBadge from './LoanStatusBadge';
import ProgressBar from './ProgressBar';
import PartiesCard from './PartiesCard';
import CollateralPropertyCard from './CollateralPropertyCard';
import LoanTermsDetailCard from './LoanTermsDetailCard';

interface LoanSummaryCardProps {
  status: string | number;
  progress: number;
  borrower: string;
  borrowerName: string;
  lender: string;
  lenderName: string;
  rentalAddress: string;
  collateralAmount: string;
  loanAmount: string;
  interestRate: number;
  duration: number;
  graceMonths: number;
  installmentAmount: string;
  lastPaidMonth: number;
  remainingMonths: number;
  isUserBorrower: boolean;
  isUserLender: boolean;
  formatAddress: (address: string) => string;
}

const LoanSummaryCard: React.FC<LoanSummaryCardProps> = (props) => {
  const {
    status,
    progress,
    borrower,
    borrowerName,
    lender,
    lenderName,
    rentalAddress,
    collateralAmount,
    loanAmount,
    interestRate,
    duration,
    graceMonths,
    installmentAmount,
    lastPaidMonth,
    remainingMonths,
    isUserBorrower,
    isUserLender,
    formatAddress
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" /> Loan Summary
        </CardTitle>
        <CardDescription>Current status and details of this loan agreement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProgressBar progress={progress} label="Repayment Progress" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <PartiesCard
              borrower={borrower}
              borrowerName={borrowerName}
              lender={lender}
              lenderName={lenderName}
              isUserBorrower={isUserBorrower}
              isUserLender={isUserLender}
              formatAddress={formatAddress}
            />
            
            <CollateralPropertyCard
              rentalAddress={rentalAddress}
              collateralAmount={collateralAmount}
              formatAddress={formatAddress}
            />
          </div>
          
          <div className="space-y-4">
            <LoanTermsDetailCard
              loanAmount={loanAmount}
              interestRate={interestRate}
              duration={duration}
              graceMonths={graceMonths}
              installmentAmount={installmentAmount}
              lastPaidMonth={lastPaidMonth}
              remainingMonths={remainingMonths}
            />
            
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium mb-3">Current Status</h3>
              <div>{<LoanStatusBadge status={status} />}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanSummaryCard; 