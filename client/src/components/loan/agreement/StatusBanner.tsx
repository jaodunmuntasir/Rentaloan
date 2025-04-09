import React from 'react';
import { LoanStatus, LoanStatusLabels } from '../../../services/loan-agreement.service';

interface StatusBannerProps {
  status: LoanStatus;
}

const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
  // Define status-specific styling
  const getStatusStyles = () => {
    switch (status) {
      case LoanStatus.INITIALIZED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case LoanStatus.READY:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case LoanStatus.ACTIVE:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case LoanStatus.PAID:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case LoanStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-300';
      case LoanStatus.DEFAULTED:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status description
  const getStatusDescription = () => {
    switch (status) {
      case LoanStatus.INITIALIZED:
        return 'Awaiting lender funding';
      case LoanStatus.READY:
        return 'Processing loan activation';
      case LoanStatus.ACTIVE:
        return 'Collateral withdrawn, processing payment';
      case LoanStatus.PAID:
        return 'Active loan with repayments in progress';
      case LoanStatus.COMPLETED:
        return 'Loan successfully completed';
      case LoanStatus.DEFAULTED:
        return 'Loan defaulted, collateral forfeited';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={`px-4 py-2 rounded-lg border ${getStatusStyles()}`}>
      <div className="font-semibold">
        Status: {LoanStatusLabels[status]}
      </div>
      <div className="text-xs">
        {getStatusDescription()}
      </div>
    </div>
  );
};

export default StatusBanner; 