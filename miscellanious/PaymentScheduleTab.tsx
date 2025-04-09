import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../ui/table';
import { Button } from '../../ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { CalendarClock, Loader2, CreditCard } from 'lucide-react';

interface Payment {
  monthNumber: number;
  date: Date;
  amount: string;
  status: 'paid' | 'due' | 'future';
  txHash?: string | null;
}

interface PaymentScheduleTabProps {
  payments: Payment[];
  formatDate: (date: Date) => string;
  getPaymentStatusBadge: (status: string) => React.ReactNode;
  isUserBorrower: boolean;
  processingAction: string | null;
  loanStatus: number | string;
  handlePayment?: (month: number, amount: string) => Promise<void>;
}

const PaymentScheduleTab: React.FC<PaymentScheduleTabProps> = ({
  payments,
  formatDate,
  getPaymentStatusBadge,
  isUserBorrower,
  processingAction,
  loanStatus,
  handlePayment
}) => {
  // Find the next unpaid payment to highlight it
  const nextPaymentDue = payments.find(p => p.status === 'due');
  const hasDuePayments = payments.some(p => p.status === 'due');
  const isLoanPaid = loanStatus === 3; // PAID status
  const canMakePayment = isUserBorrower && isLoanPaid && nextPaymentDue && handlePayment;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarClock className="h-5 w-5 mr-2" /> Payment Schedule
        </CardTitle>
        <CardDescription>Monthly payments for this loan agreement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canMakePayment && hasDuePayments && (
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Due</AlertTitle>
            <AlertDescription>
              You have a payment of {nextPaymentDue?.amount} ETH due for month {nextPaymentDue?.monthNumber}.
              Please use the Repay button to make your payment.
            </AlertDescription>
          </Alert>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              {isUserBorrower && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow 
                key={payment.monthNumber} 
                className={payment.monthNumber === nextPaymentDue?.monthNumber ? "bg-muted/40" : ""}
              >
                <TableCell className="font-medium">{payment.monthNumber}</TableCell>
                <TableCell>{formatDate(payment.date)}</TableCell>
                <TableCell>{payment.amount} ETH</TableCell>
                <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                {isUserBorrower && (
                  <TableCell>
                    {payment.status === 'due' && loanStatus === 3 && handlePayment && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handlePayment(payment.monthNumber, payment.amount)}
                        disabled={processingAction !== null || payment.monthNumber !== nextPaymentDue?.monthNumber}
                      >
                        {processingAction === 'payment' ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-3 w-3" />
                            Repay
                          </>
                        )}
                      </Button>
                    )}
                    {payment.status === 'paid' && payment.txHash && (
                      <span className="text-xs text-muted-foreground">
                        Tx: {payment.txHash.slice(0, 6)}...{payment.txHash.slice(-4)}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PaymentScheduleTab; 