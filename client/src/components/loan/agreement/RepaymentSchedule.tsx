import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { CheckCircledIcon, CrossCircledIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';

interface RepaymentScheduleProps {
  repaymentSchedule: {
    month: number;
    amount: string;
    paid: boolean;
  }[];
  lastPaidMonth: number;
  onMakePayment: (month: number) => Promise<any>;
  isProcessing: boolean;
  isBorrower: boolean;
}

const RepaymentSchedule: React.FC<RepaymentScheduleProps> = ({
  repaymentSchedule,
  lastPaidMonth,
  onMakePayment,
  isProcessing,
  isBorrower
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Function to handle payment for a specific month
  const handlePayment = async (month: number) => {
    setSelectedMonth(month);
    try {
      await onMakePayment(month);
    } finally {
      setSelectedMonth(null);
    }
  };

  // Get status badge
  const getStatusBadge = (month: number, isPaid: boolean) => {
    if (isPaid) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircledIcon className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    } else if (month === lastPaidMonth + 1) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <QuestionMarkCircledIcon className="h-3 w-3 mr-1" />
          Current Due
        </Badge>
      );
    } else if (month > lastPaidMonth + 1) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          Upcoming
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <CrossCircledIcon className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }
  };

  // Calculate due date (for demo purposes - in real app, get from contract or backend)
  const calculateDueDate = (month: number) => {
    const today = new Date();
    // Just adding month number of months to current date for simplicity
    const dueDate = new Date(today);
    dueDate.setMonth(today.getMonth() + (month - lastPaidMonth - 1));
    return dueDate.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repayment Schedule</CardTitle>
        <CardDescription>
          {isBorrower 
            ? "View and manage your loan repayments" 
            : "Track borrower's repayment progress"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              {isBorrower && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {repaymentSchedule.map((repayment) => (
              <TableRow key={repayment.month} className={repayment.month === lastPaidMonth + 1 ? "bg-blue-50" : ""}>
                <TableCell className="font-medium">{repayment.month}</TableCell>
                <TableCell>{parseFloat(repayment.amount).toFixed(4)} ETH</TableCell>
                <TableCell>
                  {repayment.paid 
                    ? "Paid" 
                    : calculateDueDate(repayment.month)
                  }
                </TableCell>
                <TableCell>
                  {getStatusBadge(repayment.month, repayment.paid)}
                </TableCell>
                {isBorrower && (
                  <TableCell className="text-right">
                    {!repayment.paid && repayment.month === lastPaidMonth + 1 && (
                      <Button 
                        size="sm" 
                        onClick={() => handlePayment(repayment.month)}
                        disabled={isProcessing || selectedMonth === repayment.month}
                      >
                        {selectedMonth === repayment.month ? "Processing..." : "Pay Now"}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Last paid month: <strong>{lastPaidMonth}</strong> of {repaymentSchedule.length}</p>
          {isBorrower && lastPaidMonth < repaymentSchedule.length && (
            <p className="mt-2 text-blue-600">
              Make your payments on time to avoid default status.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RepaymentSchedule; 