import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { LoanRequest } from './loan-request.model';

export enum LoanOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

@Table({
  tableName: 'loan_offers',
  timestamps: true
})
export class LoanOffer extends Model {
  @ForeignKey(() => LoanRequest)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  loanRequestId!: number;

  @BelongsTo(() => LoanRequest)
  loanRequest!: LoanRequest;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  lenderId!: number;

  @BelongsTo(() => User, 'lenderId')
  lender!: User;

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
    type: DataType.ENUM(...Object.values(LoanOfferStatus)),
    allowNull: false,
    defaultValue: LoanOfferStatus.PENDING
  })
  status!: LoanOfferStatus;
} 