import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { LoanStatus } from '../../../services/loan-agreement.service';

interface ActionPanelProps {
  actions: {
    id: string;
    label: string;
    action: () => Promise<any>;
    disabled: boolean;
  }[];
  isBorrower: boolean;
  isLender: boolean;
  status: LoanStatus;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  actions,
  isBorrower,
  isLender,
  status
}) => {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Toggle expanded action
  const toggleExpandAction = (actionId: string) => {
    if (expandedAction === actionId) {
      setExpandedAction(null);
    } else {
      setExpandedAction(actionId);
    }
  };

  // Get role-specific title
  const getTitle = () => {
    if (isBorrower) {
      return 'Borrower Actions';
    } else if (isLender) {
      return 'Lender Actions';
    }
    return 'Available Actions';
  };

  // Get description based on loan status
  const getDescription = () => {
    if (isBorrower) {
      switch (status) {
        case LoanStatus.INITIALIZED:
          return 'Waiting for the lender to fund the loan.';
        case LoanStatus.PAID:
          return 'Make repayments according to the schedule.';
        case LoanStatus.COMPLETED:
          return 'Loan has been fully repaid.';
        case LoanStatus.DEFAULTED:
          return 'Loan is in default status.';
        default:
          return 'Loan is in processing.';
      }
    } else if (isLender) {
      switch (status) {
        case LoanStatus.INITIALIZED:
          return 'Fund the loan to proceed.';
        case LoanStatus.PAID:
          return 'The borrower is making repayments.';
        case LoanStatus.COMPLETED:
          return 'Loan has been fully repaid.';
        case LoanStatus.DEFAULTED:
          return 'Loan is in default status. Collateral has been transferred to you.';
        default:
          return 'Loan is in processing.';
      }
    }
    return 'Actions available for this loan.';
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <p className="text-sm text-muted-foreground">{getDescription()}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-3">
          {actions.map((action) => (
            <div key={action.id} className="space-y-2">
              <Button
                onClick={() => toggleExpandAction(action.id)}
                variant={expandedAction === action.id ? "secondary" : "outline"}
                className="w-full justify-between"
                disabled={action.disabled}
              >
                {action.label}
                {expandedAction === action.id ? (
                  <span className="ml-2">▲</span>
                ) : (
                  <span className="ml-2">▼</span>
                )}
              </Button>
              
              {expandedAction === action.id && (
                <div className="p-4 border rounded-md bg-slate-50">
                  {action.id === 'fund' && (
                    <div className="space-y-4">
                      <p className="text-sm">
                        You are about to fund this loan. This will transfer ETH from your wallet to the loan contract.
                      </p>
                      <Button 
                        onClick={action.action} 
                        disabled={action.disabled}
                        className="w-full"
                      >
                        Confirm Fund Loan
                      </Button>
                    </div>
                  )}
                  
                  {action.id === 'activate' && (
                    <div className="space-y-4">
                      <p className="text-sm">
                        You are about to activate this loan. This will withdraw collateral from the rental contract.
                      </p>
                      <Button 
                        onClick={action.action} 
                        disabled={action.disabled}
                        className="w-full"
                      >
                        Confirm Activate Loan
                      </Button>
                    </div>
                  )}
                  
                  {action.id === 'payRental' && (
                    <div className="space-y-4">
                      <p className="text-sm">
                        You are about to pay the rental using loan funds. This will transfer the loan amount to the rental contract.
                      </p>
                      <Button 
                        onClick={action.action} 
                        disabled={action.disabled}
                        className="w-full"
                      >
                        Confirm Pay Rental
                      </Button>
                    </div>
                  )}
                  
                  {action.id === 'repay' && (
                    <div className="space-y-4">
                      <p className="text-sm">
                        You are about to make a repayment. This will transfer ETH from your wallet to pay your loan.
                      </p>
                      <Button 
                        onClick={action.action} 
                        disabled={action.disabled}
                        className="w-full"
                      >
                        Confirm Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionPanel; 