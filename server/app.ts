import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import rentalRoutes from './routes/rental';
import loanRoutes from './routes/loan';
import userRoutes from './routes/user';
import sequelize from './models';
import eventService from './services/event.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rental', rentalRoutes);
app.use('/api/loan', loanRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synchronized and updated if needed');
    // Initialize the event service after database is synchronized
    eventService.initEventService();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to synchronize database:', err);
  });

export default app;