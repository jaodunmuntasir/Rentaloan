import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { LoanRequest } from './loan-request.model';
import { LoanOffer } from './loan-offer.model';
import { RentalAgreement } from './rental-agreement.model';

export enum LoanAgreementStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FUNDED = 'FUNDED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CLOSED = 'CLOSED'
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
    allowNull: false
  })
  loanOfferId!: number;

  @BelongsTo(() => LoanOffer)
  loanOffer!: LoanOffer;

  @ForeignKey(() => RentalAgreement)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  rentalAgreementId!: number;

  @BelongsTo(() => RentalAgreement)
  rentalAgreement!: RentalAgreement;

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
    defaultValue: LoanAgreementStatus.CREATED
  })
  status!: LoanAgreementStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  startDate!: Date;

  @Column({
    type: DataType.DECIMAL(18, 8),
    allowNull: false,
    defaultValue: 0
  })
  remainingBalance!: string;
} 