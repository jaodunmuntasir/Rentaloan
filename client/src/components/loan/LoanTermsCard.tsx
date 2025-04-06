import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CreditCard } from 'lucide-react';
import { Separator } from '../ui/separator';

interface LoanTermsCardProps {
  amount: string;
  duration: number;
  interestRate: number;
  calculateMonthlyPayment: (amount: string, interestRate: number, duration: number) => string;
}

const LoanTermsCard: React.FC<LoanTermsCardProps> = ({
  amount,
  duration,
  interestRate,
  calculateMonthlyPayment
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" /> Loan Terms
        </CardTitle>
        <CardDescription>
          Financial details of the loan request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium">Requested Amount</p>
            <p className="text-xl font-semibold">
              {amount} ETH
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">Duration</p>
            <p className="text-xl font-semibold">
              {duration} months
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium">Interest Rate</p>
            <p className="text-xl font-semibold">
              {interestRate}%
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">Loan Terms</p>
          <div className="bg-muted p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Estimated Monthly Payment
                </p>
                <p className="font-medium">
                  {calculateMonthlyPayment(
                    amount,
                    interestRate,
                    duration
                  )}{" "}
                  ETH
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Total Payment
                </p>
                <p className="font-medium">
                  {(
                    parseFloat(amount) *
                    (1 + interestRate / 100)
                  ).toFixed(6)}{" "}
                  ETH
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanTermsCard; 