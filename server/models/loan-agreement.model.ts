import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { LoanRequest } from './loan-request.model';
import { LoanOffer } from './loan-offer.model';
import { RentalAgreement } from './rental-agreement.model';
import { Payment } from './payment.model';

/**
 * Status values match the blockchain contract Status enum:
 * Contract enum: INITIALIZED, READY, ACTIVE, PAID, COMPLETED, DEFAULTED
 */
export enum LoanAgreementStatus {
  INITIALIZED = 'INITIALIZED',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED'
}

@Table({
  tableName: 'loan_agreements',
  timestamps: true
})
export class LoanAgreement extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  contractAddress!: string;

  @ForeignKey(() => LoanRequest)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  loanRequestId!: number;

  @BelongsTo(() => LoanRequest)
  loanRequest!: LoanRequest;

  @ForeignKey(() => LoanOffer)
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  loanOfferId!: number;

  @BelongsTo(() => LoanOffer)
  loanOffer!: LoanOffer;

  // We access the rental agreement through the loan request relationship
  // No direct rentalAgreementId foreign key in this table

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  borrowerId!: number;

  @BelongsTo(() => User, 'borrowerId')
  borrower!: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  lenderId!: number;

  @BelongsTo(() => User, 'lenderId')
  lender!: User;

  @Column({
    type: DataType.DECIMAL(18, 8),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false
  })
  interestRate!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  duration!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  graceMonths!: number;

  @Column({
    type: DataType.ENUM(...Object.values(LoanAgreementStatus)),
    allowNull: false,
    defaultValue: LoanAgreementStatus.INITIALIZED
  })
  status!: LoanAgreementStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  startDate!: Date;

  // Add relationship to payments
  @HasMany(() => Payment)
  payments!: Payment[];

  /**
   * Calculate total repayment amount (principal + interest)
   */
  calculateTotalRepayment(): number {
    const principal = Number(this.amount);
    const interestRate = Number(this.interestRate) / 100; // Convert from percentage to decimal
    
    // Simple interest calculation for total loan amount
    const totalInterest = principal * interestRate * (this.duration / 12); // Annualized interest
    return principal + totalInterest;
  }
  
  /**
   * Calculate monthly payment amount
   */
  calculateMonthlyPayment(): number {
    const totalRepayment = this.calculateTotalRepayment();
    return totalRepayment / this.duration;
  }
  
  /**
   * Get payment summary with statistics
   */
  async getRepaymentsSummary(): Promise<{
    totalPaid: number;
    totalRemaining: number;
    paymentsCompleted: number;
    paymentsRemaining: number;
    nextPaymentDue: number | null;
    progress: number;
    paymentsByMonth: Record<number, number>;
  }> {
    // Get all loan repayments
    const payments = await Payment.findAll({
      where: { 
        loanAgreementId: this.id,
        type: 'LOAN_REPAYMENT'
      }
    });
    
    // Calculate total paid
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    
    // Calculate total remaining
    const totalRepayment = this.calculateTotalRepayment();
    const totalRemaining = Math.max(0, totalRepayment - totalPaid);
    
    // Calculate progress percentage
    const progress = Math.min(100, Math.round((totalPaid / totalRepayment) * 100));
    
    // Get payments by month
    const paymentsByMonth: Record<number, number> = {};
    for (let month = 1; month <= this.duration; month++) {
      paymentsByMonth[month] = 0;
    }
    
    // Fill in actual payments
    payments.forEach(payment => {
      if (payment.month !== null) {
        paymentsByMonth[payment.month] = Number(payment.amount);
      }
    });
    
    // Count completed and remaining payments
    const paymentsCompleted = Object.values(paymentsByMonth).filter(amount => amount > 0).length;
    const paymentsRemaining = this.duration - paymentsCompleted;
    
    // Find next payment due
    let nextPaymentDue: number | null = null;
    for (let month = 1; month <= this.duration; month++) {
      if (paymentsByMonth[month] === 0) {
        nextPaymentDue = month;
        break;
      }
    }
    
    return {
      totalPaid,
      totalRemaining,
      paymentsCompleted,
      paymentsRemaining,
      nextPaymentDue,
      progress,
      paymentsByMonth
    };
  }
  
  /**
   * Get remaining amount to be paid
   */
  async calculateRemainingAmount(): Promise<number> {
    const summary = await this.getRepaymentsSummary();
    return summary.totalRemaining;
  }
  
  /**
   * Get the next payment that is due
   */
  async getNextPaymentDue(): Promise<{ month: number | null; amount: number }> {
    const summary = await this.getRepaymentsSummary();
    const monthlyPayment = this.calculateMonthlyPayment();
    
    return {
      month: summary.nextPaymentDue,
      amount: monthlyPayment
    };
  }
  
  /**
   * Get loan progress information
   */
  async getLoanProgress(): Promise<{
    progress: number;
    currentStatus: LoanAgreementStatus;
    totalPaid: number;
    totalRepayment: number;
    remainingAmount: number;
  }> {
    const summary = await this.getRepaymentsSummary();
    const totalRepayment = this.calculateTotalRepayment();
    
    return {
      progress: summary.progress,
      currentStatus: this.status,
      totalPaid: summary.totalPaid,
      totalRepayment,
      remainingAmount: summary.totalRemaining
    };
  }
} 