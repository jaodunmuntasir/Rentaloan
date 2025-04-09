import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { LoanSummary as LoanSummaryType } from '../../../hooks/useLoanAgreement';

interface LoanSummaryProps {
  summary: LoanSummaryType;
  interestRate: number;
  duration: number;
}

const LoanSummary: React.FC<LoanSummaryProps> = ({
  summary,
  interestRate,
  duration
}) => {
  // Calculate interest amount
  const interestAmount = summary.totalRepayment - summary.totalLoanAmount;
  
  // Calculate monthly breakdown
  const monthlyPrincipal = summary.totalLoanAmount / duration;
  const monthlyInterest = interestAmount / duration;
  
  // Calculate remaining months
  const remainingMonths = duration - summary.currentMonth + 1;
  
  // Format ETH amounts
  const formatEth = (amount: number) => {
    return `${amount.toFixed(4)} ETH`;
  };
  
  // Format percentage
  const formatPercent = (amount: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((amount / total) * 100)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Summary</CardTitle>
        <CardDescription>Overview of your loan repayment progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Repayment Progress</span>
            <span>{summary.progress}%</span>
          </div>
          <Progress value={summary.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Month {summary.currentMonth} of {duration}</span>
            <span>Remaining: {remainingMonths} months</span>
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Principal</p>
            <p className="text-2xl font-bold">{formatEth(summary.totalLoanAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Interest ({interestRate}%)</p>
            <p className="text-2xl font-bold">{formatEth(interestAmount)}</p>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Payment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-md space-y-1">
              <p className="text-sm text-muted-foreground">Total Repayment</p>
              <p className="font-medium">{formatEth(summary.totalRepayment)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-md space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Payment</p>
              <p className="font-medium">{formatEth(summary.totalRepayment / duration)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-md space-y-1">
              <p className="text-sm text-muted-foreground">Paid So Far</p>
              <p className="font-medium">{formatEth(summary.paidAmount)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-md space-y-1">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="font-medium">{formatEth(summary.remainingAmount)}</p>
            </div>
          </div>
        </div>

        {/* Monthly breakdown */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Monthly Breakdown</h3>
          <div className="flex items-center">
            <div 
              className="h-4 bg-blue-500 rounded-l-full" 
              style={{ width: formatPercent(monthlyPrincipal, monthlyPrincipal + monthlyInterest) }}
            ></div>
            <div 
              className="h-4 bg-green-500 rounded-r-full" 
              style={{ width: formatPercent(monthlyInterest, monthlyPrincipal + monthlyInterest) }}
            ></div>
          </div>
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Principal ({formatPercent(monthlyPrincipal, monthlyPrincipal + monthlyInterest)})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Interest ({formatPercent(monthlyInterest, monthlyPrincipal + monthlyInterest)})</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanSummary; 