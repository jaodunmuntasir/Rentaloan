import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: true
})
export class User extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  firebaseId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  walletAddress!: string;
}