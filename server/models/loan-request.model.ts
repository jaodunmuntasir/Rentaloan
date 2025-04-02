import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { RentalAgreement } from './rental-agreement.model';

export enum LoanRequestStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

@Table({
  tableName: 'loan_requests',
  timestamps: true
})
export class LoanRequest extends Model {
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
  requesterId!: number;

  @BelongsTo(() => User, 'requesterId')
  requester!: User;

  @Column({
    type: DataType.DECIMAL(18, 8),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  duration!: number;

  @Column({
    type: DataType.ENUM(...Object.values(LoanRequestStatus)),
    allowNull: false,
    defaultValue: LoanRequestStatus.OPEN
  })
  status!: LoanRequestStatus;
} 