import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import rentalRoutes from './routes/rental';
import loanRoutes from './routes/loan';
import sequelize from './models';

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rental', rentalRoutes);
app.use('/api/loan', loanRoutes);
// More routes will be added later

const PORT = process.env.PORT || 5000;

// Initialize database and start server
const startServer = async () => {
  try {
    await sequelize.sync();
    console.log('Database synchronized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

export default app;