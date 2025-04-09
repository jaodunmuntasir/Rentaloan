import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { LoanDetails } from '../../../services/loan-agreement.service';
import { Separator } from '../../ui/separator';
import { Button } from '../../ui/button';
import { CopyIcon, CheckIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';

interface LoanDetailsPanelProps {
  details: LoanDetails;
  isBorrower: boolean;
  isLender: boolean;
}

const LoanDetailsPanel: React.FC<LoanDetailsPanelProps> = ({ 
  details, 
  isBorrower, 
  isLender 
}) => {
  // State for copy feedback
  const [copied, setCopied] = useState<string | null>(null);
  // State for collapsible sections
  const [sectionsOpen, setSectionsOpen] = useState({
    participants: true,
    loanTerms: true,
    collateral: true
  });

  // Function to copy text to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Function to format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Function to open blockchain explorer
  const openInExplorer = (address: string) => {
    // This would use a network-specific explorer URL
    // For now, we'll use Etherscan as an example
    window.open(`https://etherscan.io/address/${address}`, '_blank');
  };

  // Toggle section visibility
  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Agreement Details</CardTitle>
        <CardDescription>Detailed information about this loan agreement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Participants Section */}
        <div>
          <div 
            className="flex justify-between items-center cursor-pointer mb-2" 
            onClick={() => toggleSection('participants')}
          >
            <h3 className="text-lg font-semibold">Participants</h3>
            {sectionsOpen.participants ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </div>
          
          {sectionsOpen.participants && (
            <div className="space-y-4 mt-2">
              {/* Borrower Info */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Borrower</div>
                  <div className="font-mono text-sm flex items-center gap-1">
                    {formatAddress(details.borrower)}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5" 
                      onClick={() => copyToClipboard(details.borrower, 'borrower')}
                    >
                      {copied === 'borrower' ? (
                        <CheckIcon className="h-3 w-3" />
                      ) : (
                        <CopyIcon className="h-3 w-3" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5" 
                      onClick={() => openInExplorer(details.borrower)}
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                    </Button>
                  </div>
                  {isBorrower && (
                    <div className="text-xs mt-1 text-blue-600">This is you</div>
                  )}
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Lender</div>
                  <div className="font-mono text-sm flex items-center gap-1">
                    {formatAddress(details.lender)}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5" 
                      onClick={() => copyToClipboard(details.lender, 'lender')}
                    >
                      {copied === 'lender' ? (
                        <CheckIcon className="h-3 w-3" />
                      ) : (
                        <CopyIcon className="h-3 w-3" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5" 
                      onClick={() => openInExplorer(details.lender)}
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                    </Button>
                  </div>
                  {isLender && (
                    <div className="text-xs mt-1 text-green-600">This is you</div>
                  )}
                </div>
              </div>
              
              {/* Rental Contract Info */}
              <div>
                <div className="text-sm text-muted-foreground">Rental Agreement</div>
                <div className="font-mono text-sm flex items-center gap-1">
                  {formatAddress(details.rentalContract)}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5" 
                    onClick={() => copyToClipboard(details.rentalContract, 'rental')}
                  >
                    {copied === 'rental' ? (
                      <CheckIcon className="h-3 w-3" />
                    ) : (
                      <CopyIcon className="h-3 w-3" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5" 
                    onClick={() => openInExplorer(details.rentalContract)}
                  >
                    <ExternalLinkIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Loan Terms Section */}
        <div>
          <div 
            className="flex justify-between items-center cursor-pointer mb-2" 
            onClick={() => toggleSection('loanTerms')}
          >
            <h3 className="text-lg font-semibold">Loan Terms</h3>
            {sectionsOpen.loanTerms ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </div>
          
          {sectionsOpen.loanTerms && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <div>
                <div className="text-sm text-muted-foreground">Loan Amount</div>
                <div className="font-medium">{parseFloat(details.loanAmount).toFixed(4)} ETH</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Interest Rate</div>
                <div className="font-medium">{details.interestRate}%</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="font-medium">{details.duration} months</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Monthly Payment</div>
                <div className="font-medium">{parseFloat(details.monthlyPayment).toFixed(4)} ETH</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Grace Period</div>
                <div className="font-medium">{details.graceMonths} months</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Last Paid Month</div>
                <div className="font-medium">{details.lastPaidMonth} of {details.duration}</div>
              </div>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Collateral Section */}
        <div>
          <div 
            className="flex justify-between items-center cursor-pointer mb-2" 
            onClick={() => toggleSection('collateral')}
          >
            <h3 className="text-lg font-semibold">Collateral</h3>
            {sectionsOpen.collateral ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </div>
          
          {sectionsOpen.collateral && (
            <div className="space-y-2 mt-2">
              <div>
                <div className="text-sm text-muted-foreground">Collateral Amount</div>
                <div className="font-medium">{parseFloat(details.collateralAmount).toFixed(4)} ETH</div>
              </div>
              
              <div className="text-sm text-gray-600">
                The collateral is held in escrow from the rental agreement's security deposit.
                It will be returned upon successful completion of the loan.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanDetailsPanel; 