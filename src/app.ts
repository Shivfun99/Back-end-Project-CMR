import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import leadRoutes from './routes/lead.routes';
import { errorHandler } from './middleware/error.middleware';

/**
 * Express Application Configuration
 * Here we define global middlewares and mount our API routes.
 */
const app = express();

// --- Security & Logging ---
app.use(helmet()); // Basic security headers
app.use(cors());   // Enable Cross-Origin Resource Sharing
app.use(morgan('dev')); // Request logging in dev mode
app.use(express.json()); // Parse incoming JSON request bodies

// --- API Routes ---
app.use('/leads', leadRoutes);

/**
 * Health Check Endpoint
 * Used for monitoring or by container orchestrators to ensure service is alive.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// --- Errors ---
// Centralized error handler MUST be the last middleware added
app.use(errorHandler);

export default app;
