import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { ArrowLeft } from 'lucide-react';
import LoanStatusBadge from './LoanStatusBadge';

interface AgreementHeaderProps {
  status: string | number;
  createDate: Date;
  loanAmount: string;
  interestRate: number;
  formatDate: (date: Date) => string;
}

const AgreementHeader: React.FC<AgreementHeaderProps> = ({
  status,
  createDate,
  loanAmount,
  interestRate,
  formatDate
}) => {
  const navigate = useNavigate();
  
  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loan')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Loans
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Loan Agreement <LoanStatusBadge status={status} />
          </h1>
          <p className="text-muted-foreground mt-1">
            Created on {formatDate(createDate)}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold">{loanAmount} ETH</span>
          <span className="text-muted-foreground">at {interestRate}% interest</span>
        </div>
      </div>
    </>
  );
};

export default AgreementHeader; 