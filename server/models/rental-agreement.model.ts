import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

export enum RentalAgreementStatus {
  INITIALIZED = 'INITIALIZED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED'
}

@Table({
  tableName: 'rental_agreements',
  timestamps: true
})
export class RentalAgreement extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  contractAddress!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  landlordId!: number;

  @BelongsTo(() => User, 'landlordId')
  landlord!: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  renterId!: number;

  @BelongsTo(() => User, 'renterId')
  renter!: User;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.ENUM(...Object.values(RentalAgreementStatus)),
    allowNull: false,
    defaultValue: RentalAgreementStatus.INITIALIZED
  })
  status!: RentalAgreementStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  duration!: number;

  @Column({
    type: DataType.DECIMAL(18, 8),
    allowNull: false
  })
  securityDeposit!: number;

  @Column({
    type: DataType.DECIMAL(18, 8),
    allowNull: false
  })
  baseRent!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  gracePeriod!: number;
} 