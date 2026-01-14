import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { sequelize } from './config/database.js';
import { testConnection as testPgConnection, closePool } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import models to initialize associations
import './models/index.js';

// Import Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import propertyRoutes from './routes/property.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import demandRoutes from './routes/demand.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import wardRoutes from './routes/ward.routes.js';
import reportRoutes from './routes/report.routes.js';
import citizenRoutes from './routes/citizen.routes.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Check for database configuration (either DATABASE_URL or individual DB vars)
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasIndividualDbVars = !!(process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD);

if (!hasDatabaseUrl && !hasIndividualDbVars) {
  console.error('❌ Missing database configuration:');
  console.error('   Either provide DATABASE_URL or all of: DB_NAME, DB_USER, DB_PASSWORD');
  missingEnvVars.push('DATABASE_URL or (DB_NAME, DB_USER, DB_PASSWORD)');
}

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please create a .env file in the backend directory.');
  console.error('   You can copy .env.example and fill in the values.\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HTCMS Backend is running' });
});

// Database Test Route
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await testPgConnection();
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: result.message,
        timestamp: result.time,
        database: 'Connected to Supabase PostgreSQL'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Database test route error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test database connection',
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/citizen', citizenRoutes);

// Error Handling Middleware (must be last)
app.use(errorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database Connection and Server Start
const startServer = async () => {
  try {
    // Test PostgreSQL connection (Supabase)
    console.log('🔌 Testing PostgreSQL connection...');
    const pgResult = await testPgConnection();
    if (!pgResult.success) {
      console.error('❌ PostgreSQL connection failed. Server will not start.');
      console.error('   Please check your DATABASE_URL environment variable.');
      process.exit(1);
    }

    // Test Sequelize connection (for ORM models)
    try {
      await sequelize.authenticate();
      console.log('✅ Sequelize connection established successfully.');
      console.log('📊 All database operations will use Supabase PostgreSQL');
    } catch (sequelizeError) {
      console.error('❌ Sequelize connection failed:', sequelizeError.message);
      console.error('   Please check your DATABASE_URL configuration.');
      process.exit(1);
    }

    // Sync database (use with caution in production)
    if (process.env.NODE_ENV === 'development') {
      // await sequelize.sync({ alter: true });
      console.log('📊 Database models loaded.');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database test endpoint: http://localhost:${PORT}/api/db-test`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);
  try {
    await closePool();
    await sequelize.close();
    console.log('✅ All database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
