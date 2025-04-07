import React from 'react';
import { Badge } from '../../ui/badge';
import { LoanAgreementStatus } from '../../../services/blockchain.service';

interface LoanStatusBadgeProps {
  status: string | number;
}

const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({ status }) => {
  if (!status) return <Badge>Unknown</Badge>;
  
  switch (status) {
    case 'INITIALIZED':
    case LoanAgreementStatus.INITIALIZED.toString():
      return <Badge variant="outline">Initialized</Badge>;
    case 'READY':
    case LoanAgreementStatus.READY.toString():
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>;
    case 'PAID':
    case LoanAgreementStatus.PAID.toString():
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
    case 'ACTIVE':
    case LoanAgreementStatus.ACTIVE.toString():
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
    case 'COMPLETED':
    case LoanAgreementStatus.COMPLETED.toString():
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'DEFAULTED':
    case LoanAgreementStatus.DEFAULTED.toString():
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Defaulted</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default LoanStatusBadge; 