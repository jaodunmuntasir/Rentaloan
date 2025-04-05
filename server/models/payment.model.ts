import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { RentalAgreement } from './rental-agreement.model';
import { LoanAgreement } from './loan-agreement.model';

export enum PaymentType {
  SECURITY_DEPOSIT = 'SECURITY_DEPOSIT',
  RENT = 'RENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  LOAN_INITIALIZATION = 'LOAN_INITIALIZATION',
  CONTRACT_CREATION = 'CONTRACT_CREATION',
  RENT_SKIPPED = 'RENT_SKIPPED'
}

@Table({
  tableName: 'payments',
  timestamps: true
})
export class Payment extends Model {
  @ForeignKey(() => RentalAgreement)
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  rentalAgreementId!: number | null;

  @BelongsTo(() => RentalAgreement)
  rentalAgreement!: RentalAgreement;

  @ForeignKey(() => LoanAgreement)
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  loanAgreementId!: number | null;

  @BelongsTo(() => LoanAgreement)
  loanAgreement!: LoanAgreement;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  payerId!: number;

  @BelongsTo(() => User, 'payerId')
  payer!: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  recipientId!: number;

  @BelongsTo(() => User, 'recipientId')
  recipient!: User;

  @Column({
    type: DataType.DECIMAL(18, 8),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  txHash!: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentType)),
    allowNull: false
  })
  type!: PaymentType;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  month!: number | null;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  paymentDate!: Date;
} 