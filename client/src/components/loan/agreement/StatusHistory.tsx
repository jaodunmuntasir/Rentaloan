import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { StatusHistoryEntry, StatusTrackingService } from '../../../services/status-tracking.service';
import { useAuth } from '../../../contexts/AuthContext';
import { LoanStatus, LoanStatusLabels } from '../../../services/loan-agreement.service';
import { CalendarIcon, Link1Icon } from '@radix-ui/react-icons';

interface StatusHistoryProps {
  loanAddress: string;
}

const StatusHistory: React.FC<StatusHistoryProps> = ({ loanAddress }) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser || !loanAddress) return;
      
      setLoading(true);
      try {
        // Try to get existing history first
        let historyEntries = StatusTrackingService.getStatusHistory(loanAddress);
        
        // If no history or just a few entries, sync with backend
        if (historyEntries.length < 2) {
          // Get Firebase token
          const token = await currentUser.getIdToken();
          
          // Create AppUser format
          const user = {
            id: currentUser.uid,
            email: currentUser.email || '',
            name: currentUser.displayName || '',
            walletAddress: null,
            token: token
          };
          
          // Sync with backend
          historyEntries = await StatusTrackingService.syncStatusHistory(user, loanAddress);
        }
        
        // Sort by timestamp (newest first)
        historyEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setHistory(historyEntries);
      } catch (error) {
        console.error('Error loading status history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, [loanAddress, currentUser]);
  
  // Get status color class
  const getStatusColor = (status: LoanStatus) => {
    switch (status) {
      case LoanStatus.INITIALIZED:
        return 'bg-yellow-100 text-yellow-800';
      case LoanStatus.READY:
        return 'bg-orange-100 text-orange-800';
      case LoanStatus.ACTIVE:
        return 'bg-blue-100 text-blue-800';
      case LoanStatus.PAID:
        return 'bg-indigo-100 text-indigo-800';
      case LoanStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case LoanStatus.DEFAULTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Generate etherscan link for transaction
  const getEtherscanLink = (txHash: string) => {
    // Use sepolia network for testnet
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-muted-foreground">Loading status history...</div>
        ) : history.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">No status history available</div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={index} className="relative pl-6 border-l-2 border-slate-200 pb-4">
                {/* Status dot */}
                <div className={`absolute left-[-8px] rounded-full w-4 h-4 ${getStatusColor(entry.status)}`} />
                
                {/* Status label and timestamp */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                  <div className="font-medium">{entry.statusLabel}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDate(entry.timestamp)}
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-sm mt-1 text-muted-foreground">{entry.description}</p>
                
                {/* Transaction link if available */}
                {entry.transactionHash && (
                  <a 
                    href={getEtherscanLink(entry.transactionHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                  >
                    <Link1Icon className="h-3 w-3" />
                    View Transaction
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusHistory; 