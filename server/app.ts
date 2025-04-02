import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (to be added)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/rental', require('./routes/rental'));
// app.use('/api/loan', require('./routes/loan'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
