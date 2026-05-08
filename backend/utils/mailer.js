import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// SMTP Transporter — production-ready with timeouts, TLS, and retry
// ---------------------------------------------------------------------------

const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.EMAIL_SECURE === 'true') || (SMTP_PORT === 465);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,                   // true for 465, false for 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // --- Timeouts (prevent ETIMEDOUT on slow cloud networks) ---
  connectionTimeout: 20_000,             // 20 s to establish TCP connection
  greetingTimeout: 20_000,               // 20 s for SMTP greeting
  socketTimeout: 30_000,                 // 30 s for socket inactivity
  // --- TLS (cloud / Render / Vercel compatible) ---
  tls: {
    rejectUnauthorized: false,           // accept self-signed certs in some hosts
  },
  // --- Connection pool (reuse connections for multiple sends) ---
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  // --- Debug: enable in non-production to trace SMTP handshake ---
  debug: process.env.NODE_ENV !== 'production',
  logger: process.env.NODE_ENV !== 'production',
});

// ---------------------------------------------------------------------------
// Verify transporter — call from server.js on startup
// ---------------------------------------------------------------------------
export const verifyTransporter = async () => {
  const maskedUser = SMTP_USER
    ? SMTP_USER.replace(/^(.{2})(.*)(@.*)$/, '$1***$3')
    : '(not set)';

  console.log(`[SMTP] host=${SMTP_HOST} port=${SMTP_PORT} secure=${SMTP_SECURE} user=${maskedUser}`);

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[SMTP] ⚠ SMTP credentials are missing — emails will NOT be sent.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[SMTP] ✓ Transporter verified — ready to send emails.');
    return true;
  } catch (err) {
    console.error(`[SMTP] ✗ Transporter verification failed: ${err.message}`);
    console.error(`[SMTP]   code=${err.code || 'N/A'} command=${err.command || 'N/A'}`);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Send mail — with retry (1 retry after 3 s) and graceful error handling
// ---------------------------------------------------------------------------
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 3_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const sendMail = async ({ to, subject, text, html }) => {
  const from = `"${process.env.EMAIL_FROM_NAME || 'Urban Local Bodies'}" <${process.env.EMAIL_FROM_ADDRESS || SMTP_USER}>`;

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail({ from, to, subject, text, html });
      console.log(`[SMTP] Email sent to ${to} (messageId=${info.messageId})`);
      return info;
    } catch (err) {
      lastError = err;
      const isRetryable = ['ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'ECONNREFUSED'].includes(err.code);

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`[SMTP] Attempt ${attempt + 1} failed (${err.code}), retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        // Non-retryable or exhausted retries
        console.error(`[SMTP] Failed to send email to ${to}: ${err.message} (code=${err.code || 'N/A'})`);
        break;
      }
    }
  }

  throw lastError;
};

export { transporter };
