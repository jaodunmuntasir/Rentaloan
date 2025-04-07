import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../ui/table';
import { CalendarClock } from 'lucide-react';

interface Payment {
  monthNumber: number;
  date: Date;
  amount: string;
  status: 'paid' | 'due' | 'future';
}

interface PaymentScheduleTabProps {
  payments: Payment[];
  formatDate: (date: Date) => string;
  getPaymentStatusBadge: (status: string) => React.ReactNode;
}

const PaymentScheduleTab: React.FC<PaymentScheduleTabProps> = ({
  payments,
  formatDate,
  getPaymentStatusBadge
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarClock className="h-5 w-5 mr-2" /> Payment Schedule
        </CardTitle>
        <CardDescription>Monthly payments for this loan agreement</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.monthNumber}>
                <TableCell className="font-medium">{payment.monthNumber}</TableCell>
                <TableCell>{formatDate(payment.date)}</TableCell>
                <TableCell>{payment.amount} ETH</TableCell>
                <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PaymentScheduleTab; 