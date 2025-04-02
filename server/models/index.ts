import { Sequelize } from 'sequelize-typescript';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { User } from './user.model';
import { RentalAgreement } from './rental-agreement.model';
import { LoanRequest } from './loan-request.model';
import { LoanOffer } from './loan-offer.model';
import { LoanAgreement } from './loan-agreement.model';
import { Payment } from './payment.model';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const config = require('../config/database.js')[env];

const sequelize = new Sequelize({
  database: config.database,
  dialect: config.dialect,
  storage: config.storage,
  models: [User, RentalAgreement, LoanRequest, LoanOffer, LoanAgreement, Payment] // Add all models here
});

export default sequelize;