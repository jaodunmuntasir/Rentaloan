import { Sequelize } from 'sequelize-typescript';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { User } from './user.model';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const config = require('../config/database.js')[env];

const sequelize = new Sequelize({
  database: config.database,
  dialect: config.dialect,
  storage: config.storage,
  models: [User] // Add all models here
});

export default sequelize;