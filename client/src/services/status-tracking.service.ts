import { LoanStatus, LoanStatusLabels } from './loan-agreement.service';
import { toast } from 'sonner';
import { LoanApi } from './api.service';
import { User as AppUser } from '../types/user.types';

/**
 * Status change event with metadata
 */
export interface StatusChangeEvent {
  previousStatus: LoanStatus;
  newStatus: LoanStatus;
  timestamp: Date;
  transactionHash?: string;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  status: LoanStatus;
  statusLabel: string;
  description: string;
  timestamp: Date;
  transactionHash?: string;
}

/**
 * Service for tracking and managing loan status changes
 */
export class StatusTrackingService {
  private static statusChangeListeners: ((event: StatusChangeEvent) => void)[] = [];
  private static statusHistory: Map<string, StatusHistoryEntry[]> = new Map();
  
  /**
   * Register a status change for a loan agreement
   * 
   * @param contractAddress Loan agreement contract address
   * @param previousStatus Previous status
   * @param newStatus New status
   * @param transactionHash Optional transaction hash
   * @returns Status change event
   */
  static async registerStatusChange(
    contractAddress: string,
    previousStatus: LoanStatus,
    newStatus: LoanStatus,
    transactionHash?: string
  ): Promise<StatusChangeEvent> {
    // Create event
    const event: StatusChangeEvent = {
      previousStatus,
      newStatus,
      timestamp: new Date(),
      transactionHash
    };
    
    // Update history
    this.addToStatusHistory(contractAddress, {
      status: newStatus,
      statusLabel: LoanStatusLabels[newStatus],
      description: this.getStatusDescription(newStatus),
      timestamp: event.timestamp,
      transactionHash
    });
    
    // Notify listeners
    this.notifyStatusChange(event);
    
    // Show toast notification for important status changes
    this.showStatusNotification(previousStatus, newStatus);
    
    return event;
  }
  
  /**
   * Add a listener for status changes
   * 
   * @param listener Function to call when status changes
   * @returns Function to remove the listener
   */
  static addStatusChangeListener(listener: (event: StatusChangeEvent) => void): () => void {
    this.statusChangeListeners.push(listener);
    
    // Return function to remove listener
    return () => {
      const index = this.statusChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.statusChangeListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Get status history for a loan agreement
   * 
   * @param contractAddress Loan agreement contract address
   * @returns Array of status history entries
   */
  static getStatusHistory(contractAddress: string): StatusHistoryEntry[] {
    return this.statusHistory.get(contractAddress) || [];
  }
  
  /**
   * Synchronize status history with backend
   * 
   * @param user Current user
   * @param contractAddress Loan agreement contract address
   * @returns Promise resolving to status history
   */
  static async syncStatusHistory(
    user: AppUser,
    contractAddress: string
  ): Promise<StatusHistoryEntry[]> {
    try {
      // Fetch status details from backend
      const response = await LoanApi.getLoanStatusDetails(user, contractAddress);
      
      if (response.success && response.status) {
        // Extract status history
        const history: StatusHistoryEntry[] = response.status.history.map((entry: any) => ({
          status: this.parseStatusFromChange(entry.change),
          statusLabel: entry.change,
          description: entry.note || '',
          timestamp: new Date(entry.date),
          transactionHash: entry.txHash
        }));
        
        // Update local history
        this.statusHistory.set(contractAddress, history);
        
        return history;
      }
      
      return this.getStatusHistory(contractAddress);
    } catch (error) {
      console.error('Error syncing status history:', error);
      return this.getStatusHistory(contractAddress);
    }
  }
  
  /**
   * Get status description
   * 
   * @param status Loan status
   * @returns Human-readable description
   */
  static getStatusDescription(status: LoanStatus): string {
    switch (status) {
      case LoanStatus.INITIALIZED:
        return 'The loan agreement has been initialized but not yet funded by the lender.';
      case LoanStatus.READY:
        return 'The loan has been funded by the lender and is ready to be activated.';
      case LoanStatus.ACTIVE:
        return 'The loan is active with collateral withdrawn.';
      case LoanStatus.PAID:
        return 'The loan is active and repayments are being made.';
      case LoanStatus.COMPLETED:
        return 'The loan has been fully repaid and completed successfully.';
      case LoanStatus.DEFAULTED:
        return 'The loan has been defaulted. Collateral has been forfeited.';
      default:
        return 'Unknown status';
    }
  }
  
  /**
   * Add an entry to status history
   * 
   * @param contractAddress Loan agreement contract address
   * @param entry Status history entry
   */
  private static addToStatusHistory(contractAddress: string, entry: StatusHistoryEntry): void {
    const history = this.statusHistory.get(contractAddress) || [];
    history.push(entry);
    this.statusHistory.set(contractAddress, history);
  }
  
  /**
   * Notify all listeners of a status change
   * 
   * @param event Status change event
   */
  private static notifyStatusChange(event: StatusChangeEvent): void {
    this.statusChangeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in status change listener:', error);
      }
    });
  }
  
  /**
   * Show a toast notification for important status changes
   * 
   * @param previousStatus Previous status
   * @param newStatus New status
   */
  private static showStatusNotification(previousStatus: LoanStatus, newStatus: LoanStatus): void {
    // Don't show notification if status didn't change
    if (previousStatus === newStatus) {
      return;
    }
    
    const statusLabel = LoanStatusLabels[newStatus];
    
    switch (newStatus) {
      case LoanStatus.READY:
        toast.success(`Loan Funded`, {
          description: 'The loan has been funded by the lender and is ready to be activated.',
          duration: 5000
        });
        break;
      case LoanStatus.ACTIVE:
        toast.info(`Loan Activated`, {
          description: 'The loan is now active. Collateral has been withdrawn.',
          duration: 5000
        });
        break;
      case LoanStatus.COMPLETED:
        toast.success(`Loan Completed`, {
          description: 'The loan has been fully repaid. Congratulations!',
          duration: 5000
        });
        break;
      case LoanStatus.DEFAULTED:
        toast.error(`Loan Defaulted`, {
          description: 'The loan has been defaulted. Collateral has been forfeited.',
          duration: 5000
        });
        break;
      default:
        toast.info(`Loan Status Changed: ${statusLabel}`, {
          description: this.getStatusDescription(newStatus),
          duration: 3000
        });
    }
  }
  
  /**
   * Parse status from status change string
   * 
   * @param statusChange Status change description
   * @returns Corresponding loan status or -1 if unknown
   */
  private static parseStatusFromChange(statusChange: string): LoanStatus {
    if (statusChange.includes('Created')) {
      return LoanStatus.INITIALIZED;
    } else if (statusChange.includes('Funded')) {
      return LoanStatus.READY;
    } else if (statusChange.includes('Completed')) {
      return LoanStatus.COMPLETED;
    } else if (statusChange.includes('Defaulted')) {
      return LoanStatus.DEFAULTED;
    } else if (statusChange.includes('Activated')) {
      return LoanStatus.ACTIVE;
    } else if (statusChange.includes('Repayment')) {
      return LoanStatus.PAID;
    }
    
    return -1 as LoanStatus;
  }
} 