import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  Building,
  MoreHorizontal,
  Clock,
  DollarSign
} from 'lucide-react';

// Define interface for payment
interface Payment {
  id: string;
  amount: string;
  paymentDate: string;
  type: 'SECURITY_DEPOSIT' | 'RENT' | 'LOAN_REPAYMENT' | 'LOAN_INITIALIZATION' | 'CONTRACT_CREATION' | 'RENT_SKIPPED';
  userRole: 'payer' | 'recipient';
  rentalAgreement?: {
    contractAddress: string;
    name: string;
  };
  loanAgreement?: {
    contractAddress: string;
  };
  payer?: {
    id: string;
    email: string;
  };
  recipient?: {
    id: string;
    email: string;
  };
}

interface RecentActivityProps {
  payments: Payment[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  payments
}) => {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get payment type display info
  const getPaymentTypeInfo = (payment: Payment) => {
    switch (payment.type) {
      case 'SECURITY_DEPOSIT':
        return {
          icon: <Building className="h-4 w-4" />,
          title: 'Security Deposit',
          badge: <Badge variant="outline" className="bg-blue-50 text-blue-700">Deposit</Badge>
        };
      case 'RENT':
        return {
          icon: <Building className="h-4 w-4" />,
          title: 'Rent Payment',
          badge: <Badge variant="outline" className="bg-purple-50 text-purple-700">Rent</Badge>
        };
      case 'LOAN_REPAYMENT':
        return {
          icon: <CreditCard className="h-4 w-4" />,
          title: 'Loan Repayment',
          badge: <Badge variant="outline" className="bg-green-50 text-green-700">Repayment</Badge>
        };
      case 'LOAN_INITIALIZATION':
        return {
          icon: <CreditCard className="h-4 w-4" />,
          title: 'Loan Initialization',
          badge: <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Initialization</Badge>
        };
      case 'CONTRACT_CREATION':
        return {
          icon: <DollarSign className="h-4 w-4" />,
          title: 'Contract Creation',
          badge: <Badge variant="outline" className="bg-gray-50 text-gray-700">Creation</Badge>
        };
      case 'RENT_SKIPPED':
        return {
          icon: <Clock className="h-4 w-4" />,
          title: 'Rent Skipped',
          badge: <Badge variant="outline" className="bg-red-50 text-red-700">Skipped</Badge>
        };
      default:
        return {
          icon: <DollarSign className="h-4 w-4" />,
          title: 'Payment',
          badge: <Badge variant="outline">Unknown</Badge>
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest transactions and payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-6">
            <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No recent activity</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Your recent transactions will appear here
            </p>
          </div>
        ) : (
          payments.slice(0, 5).map((payment, index) => {
            const isIncoming = payment.userRole === 'recipient';
            const typeInfo = getPaymentTypeInfo(payment);
            const otherParty = isIncoming ? payment.payer : payment.recipient;
            
            return (
              <React.Fragment key={payment.id}>
                <div className="flex items-start justify-between py-2">
                  <div className="flex">
                    <div className={`p-2 rounded-full mr-3 ${isIncoming ? 'bg-green-50' : 'bg-blue-50'}`}>
                      {isIncoming ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{typeInfo.title}</span>
                        {typeInfo.badge}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        {typeInfo.icon}
                        <span className="ml-1">
                          {payment.rentalAgreement?.name || 
                           (payment.loanAgreement 
                             ? `Loan ${payment.loanAgreement.contractAddress.substring(0, 6)}...` 
                             : 'General')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(payment.paymentDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${isIncoming ? 'text-green-600' : 'text-blue-600'}`}>
                      {isIncoming ? '+' : '-'}{payment.amount} ETH
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isIncoming ? 'From: ' : 'To: '}
                      {otherParty?.email.split('@')[0] || 'Unknown'}
                    </div>
                  </div>
                </div>
                {index < payments.length - 1 && <Separator />}
              </React.Fragment>
            );
          })
        )}
        
        {payments.length > 5 && (
          <>
            <Separator />
            <div className="flex justify-center py-2">
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity; 