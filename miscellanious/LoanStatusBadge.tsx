import React from 'react';
import { Badge } from '../../ui/badge';
import { LoanAgreementStatus } from '../../../services/blockchain.service';

interface LoanStatusBadgeProps {
  status: string | number;
}

const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({ status }) => {
  if (status === undefined || status === null) return <Badge>Unknown</Badge>;
  
  // Convert status to number if it's a numeric string
  const numericStatus = typeof status === 'string' && !isNaN(Number(status)) 
    ? Number(status) 
    : typeof status === 'number' 
      ? status 
      : null;
  
  // Check if status is a numeric value
  if (numericStatus !== null) {
    switch (numericStatus) {
      case LoanAgreementStatus.INITIALIZED:
        return <Badge variant="outline">Initialized</Badge>;
      case LoanAgreementStatus.READY:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>;
      case LoanAgreementStatus.ACTIVE:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
      case LoanAgreementStatus.PAID:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case LoanAgreementStatus.COMPLETED:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case LoanAgreementStatus.DEFAULTED:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Defaulted</Badge>;
    }
  }

  // Handle string status values
  switch (status) {
    case 'INITIALIZED':
    case 'CREATED':
      return <Badge variant="outline">Initialized</Badge>;
    case 'READY':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>;
    case 'ACTIVE':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
    case 'PAID':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'DEFAULTED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Defaulted</Badge>;
    default:
      return <Badge>Unknown ({status})</Badge>;
  }
};

export default LoanStatusBadge; 