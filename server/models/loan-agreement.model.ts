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
} 