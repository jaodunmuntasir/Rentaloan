import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { ExternalLinkIcon, CalendarIcon, CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import { Button } from '../../ui/button';
import { Separator } from '../../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useAuth } from '../../../contexts/AuthContext';
import { LoanApi } from '../../../services/api.service';

interface Transaction {
  id: number;
  type: string;
  amount: string;
  date: string;
  txHash: string;
  payer: {
    id: number;
    email: string;
  };
  recipient: {
    id: number;
    email: string;
  };
  month?: number;
}

interface TransactionHistoryProps {
  loanAddress: string;
  borrower: string;
  lender: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  loanAddress,
  borrower,
  lender
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);
  
  const { currentUser } = useAuth();

  // Load transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!currentUser || !loanAddress) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // This is a placeholder for actual API call
        // In real implementation, get token and call API
        const token = await currentUser.getIdToken();
        
        // Create a mock AppUser object with the token
        const appUser = {
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          token,
          walletAddress: null
        };
        
        // Get loan agreement details which includes payments
        const response = await LoanApi.getLoanAgreement(appUser, loanAddress);
        
        if (response && response.loanAgreement && response.loanAgreement.payments) {
          // Transform payments to transaction format
          const txs = response.loanAgreement.payments.map((payment: any) => ({
            id: payment.id,
            type: payment.type,
            amount: payment.amount,
            date: new Date(payment.paymentDate).toLocaleString(),
            txHash: payment.txHash,
            payer: payment.payer,
            recipient: payment.recipient,
            month: payment.month
          }));
          
          setTransactions(txs);
        } else {
          setTransactions([]);
        }
      } catch (err: any) {
        console.error("Error fetching transactions:", err);
        setError(err.message || "Failed to load transaction history");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentUser, loanAddress]);

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'all') return true;
    return tx.type.toLowerCase() === activeTab.toLowerCase();
  });

  // Function to copy text to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Function to open transaction in blockchain explorer
  const openInExplorer = (hash: string) => {
    window.open(`https://etherscan.io/tx/${hash}`, '_blank');
  };

  // Get transaction type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'LOAN_INITIALIZATION':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Funding</Badge>;
      case 'LOAN_REPAYMENT':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Repayment</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{type}</Badge>;
    }
  };

  // Helper to truncate text
  const truncate = (text: string, length = 8) => {
    if (!text) return '';
    if (text.length <= length * 2) return text;
    return `${text.substring(0, length)}...${text.substring(text.length - length)}`;
  };

  // Handle loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Loading transaction history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              <div className="h-6 bg-slate-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Error loading transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>History of transactions for this loan agreement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="LOAN_INITIALIZATION">Funding</TabsTrigger>
            <TabsTrigger value="LOAN_REPAYMENT">Repayments</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(tx.type)}
                        {tx.month && (
                          <span className="text-sm text-muted-foreground">
                            Month {tx.month}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-medium">
                        {parseFloat(tx.amount).toFixed(4)} ETH
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{tx.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-muted-foreground">From: </span>
                      <span className="font-medium">{tx.payer.email}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">To: </span>
                      <span className="font-medium">{tx.recipient.email}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                      {truncate(tx.txHash)}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5" 
                        onClick={() => copyToClipboard(tx.txHash, `tx-${tx.id}`)}
                      >
                        {copied === `tx-${tx.id}` ? (
                          <CheckIcon className="h-3 w-3" />
                        ) : (
                          <CopyIcon className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7" 
                      onClick={() => openInExplorer(tx.txHash)}
                    >
                      <ExternalLinkIcon className="h-3 w-3 mr-1" />
                      View on Explorer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransactionHistory; 