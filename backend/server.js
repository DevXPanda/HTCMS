import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { sequelize } from "./config/database.js";
import { testConnection as testPgConnection, closePool } from "./db.js";

// Load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://htcms.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS BLOCKED:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Root Test Route
app.get("/", (req, res) => {
  res.json({ status: "Backend running", version: "1.0.0" });
});

// Health Route
app.get("/health", (req, res) => {
  res.json({ health: "ok" });
});

// Test DB
app.get("/api/db-test", async (req, res) => {
  const result = await testPgConnection();
  res.json(result);
});

// Import routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import assessmentRoutes from "./routes/assessment.routes.js";
import demandRoutes from "./routes/demand.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import wardRoutes from "./routes/ward.routes.js";
import reportRoutes from "./routes/report.routes.js";
import citizenRoutes from "./routes/citizen.routes.js";
import noticeRoutes from "./routes/notice.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import penaltyRuleRoutes from "./routes/penaltyRule.routes.js";
import { startPenaltyCronJob } from "./services/penaltyCron.js";

// API Routes prefix
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/demands", demandRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/citizen", citizenRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/penalty-rules", penaltyRuleRoutes);

// 404 route handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => e.message)
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry: ' + err.errors[0]?.message || 'This record already exists'
    });
  }

  // Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference: ' + (err.message || 'Referenced record does not exist')
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  console.log("Starting backend...");
  console.log("Database:", process.env.DATABASE_URL);

  const pg = await testPgConnection();
  if (!pg.success) {
    console.log("Database connection failed.");
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log("Sequelize connected");
  } catch (err) {
    console.log("Sequelize error:", err.message);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);

    // Start penalty cron job
    startPenaltyCronJob();
  });
};

startServer();
