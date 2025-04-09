import React from 'react';
import { Wallet } from 'lucide-react';

interface LoanTermsDetailCardProps {
  loanAmount: string;
  interestRate: number;
  duration: number;
  graceMonths: number;
  installmentAmount: string;
  lastPaidMonth: number;
  remainingMonths: number;
}

const LoanTermsDetailCard: React.FC<LoanTermsDetailCardProps> = ({
  loanAmount,
  interestRate,
  duration,
  graceMonths,
  installmentAmount,
  lastPaidMonth,
  remainingMonths
}) => {
  return (
    <div className="rounded-lg bg-muted p-4">
      <h3 className="font-medium flex items-center mb-3">
        <Wallet className="h-4 w-4 mr-2 text-muted-foreground" /> Loan Terms
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Loan Amount:</span>
          <span className="font-medium">{loanAmount} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Interest Rate:</span>
          <span className="font-medium">{interestRate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration:</span>
          <span className="font-medium">{duration} months</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Grace Period:</span>
          <span className="font-medium">{graceMonths} month{graceMonths !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Monthly Payment:</span>
          <span className="font-medium">{installmentAmount} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payments Made:</span>
          <span className="font-medium">{lastPaidMonth} of {duration}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Remaining Payments:</span>
          <span className="font-medium">{remainingMonths}</span>
        </div>
      </div>
    </div>
  );
};

export default LoanTermsDetailCard; 