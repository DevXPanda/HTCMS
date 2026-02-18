import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { sequelize } from "./config/database.js";
import { testConnection as testPgConnection, closePool } from "./db.js";

// Load env
dotenv.config();

// Global production safety: Disable debug console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => { };
  console.debug = () => { };
  console.info = () => { };
  // console.error and console.warn remain active for critical logging
}

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
// Use minimal logging format in production, dev format in development
app.use(morgan(process.env.NODE_ENV === 'production' ? ':method :url :status :response-time ms' : 'dev'));

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
import attendanceRoutes from "./routes/attendance.routes.js";
import fieldVisitRoutes from "./routes/fieldVisit.routes.js";
import taskEngineRoutes from "./routes/taskEngine.routes.js";
import fieldMonitoringRoutes from "./routes/fieldMonitoring.routes.js";
import fieldWorkerMonitoringRoutes from "./routes/fieldWorkerMonitoring.routes.js";
import workerTaskRoutes from "./routes/workerTask.routes.js";
import workerRoutes from "./routes/worker.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import waterConnectionRoutes from "./routes/waterConnection.routes.js";
import waterMeterReadingRoutes from "./routes/waterMeterReading.routes.js";
import waterBillRoutes from "./routes/waterBill.routes.js";
import waterPaymentRoutes from "./routes/waterPayment.routes.js";
import waterDashboardRoutes from "./routes/waterDashboard.routes.js";
import waterTaxAssessmentRoutes from "./routes/waterTaxAssessment.routes.js";
import waterConnectionDocumentRoutes from "./routes/waterConnectionDocument.routes.js";
import waterConnectionRequestRoutes from "./routes/waterConnectionRequest.routes.js";
import propertyApplicationRoutes from "./routes/propertyApplication.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import shopTaxAssessmentRoutes from "./routes/shopTaxAssessment.routes.js";
import shopRegistrationRequestRoutes from "./routes/shopRegistrationRequest.routes.js";
import clerkRoutes from "./routes/clerk.routes.js";
import taxRoutes from "./routes/tax.routes.js";
import inspectorRoutes from "./routes/inspector.routes.js";
import officerRoutes from "./routes/officer.routes.js";
import adminManagementRoutes from "./routes/adminManagement.routes.js";
import employeeAuthRoutes from "./routes/employeeAuth.routes.js";
import { startPenaltyCronJob } from "./services/penaltyCron.js";
import { startTaskGeneratorCronJob } from "./services/taskGeneratorCron.js";
import { startAlertCronJob } from "./services/alertCron.js";
import d2dcRoutes from "./routes/d2dc.routes.js";
import path from 'path';
import { fileURLToPath } from 'url';

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
app.use("/api/attendance", attendanceRoutes);
app.use("/api/field-visits", fieldVisitRoutes);
app.use("/api/tasks", taskEngineRoutes);
app.use("/api/field-monitoring", fieldMonitoringRoutes);
app.use("/api/field-worker-monitoring", fieldWorkerMonitoringRoutes);
app.use("/api/worker-tasks", workerTaskRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/water-connections", waterConnectionRoutes);
app.use("/api/water-meter-readings", waterMeterReadingRoutes);
app.use("/api/water-bills", waterBillRoutes);
app.use("/api/water-payments", waterPaymentRoutes);
app.use("/api/water-dashboard", waterDashboardRoutes);
app.use("/api/water-tax-assessments", waterTaxAssessmentRoutes);
app.use("/api/water-connection-documents", waterConnectionDocumentRoutes);
app.use("/api/water-connection-requests", waterConnectionRequestRoutes);
app.use("/api/property-applications", propertyApplicationRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/shop-tax-assessments", shopTaxAssessmentRoutes);
app.use("/api/shop-registration-requests", shopRegistrationRequestRoutes);
app.use("/api/clerk", clerkRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/inspector", inspectorRoutes);
app.use("/api/officer", officerRoutes);
app.use("/api/admin-management", adminManagementRoutes);
app.use("/api/employee-auth", employeeAuthRoutes);
app.use("/api/d2dc", d2dcRoutes);

// Serve uploaded files statically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 route handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handling middleware
app.use((err, req, res, next) => {
  // Only log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

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

    // Start cron jobs
    startPenaltyCronJob();
    startTaskGeneratorCronJob();
    startAlertCronJob();
  });
};

startServer();
