import React from 'react';
import { Badge } from '../../ui/badge';

interface PaymentStatusBadgeProps {
  status: string;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'paid':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
    case 'due':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Due</Badge>;
    case 'future':
      return <Badge variant="outline">Upcoming</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default PaymentStatusBadge; 