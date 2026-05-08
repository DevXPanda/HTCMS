import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// SMTP Configuration — production-ready for Render / Vercel / cloud hosts
// ---------------------------------------------------------------------------
// Render free tier often kills long-lived TCP connections and may throttle
// outbound SMTP on port 587. For Gmail, port 465 (direct SSL) is more reliable.
// ---------------------------------------------------------------------------

const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;

// Auto-select port: prefer 465 (SSL) for Gmail on cloud hosts, fallback to env var
const envPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 0;
const SMTP_PORT = envPort || (SMTP_HOST.includes('gmail') ? 465 : 587);
const SMTP_SECURE = (process.env.EMAIL_SECURE === 'true') || (SMTP_PORT === 465);

// ---------------------------------------------------------------------------
// Build transporter config (no connection pooling — Render kills idle TCP)
// ---------------------------------------------------------------------------
function buildTransportConfig() {
  return {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Timeouts tuned for cloud hosts with high-latency outbound connections
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 45_000,
    // TLS — compatible with Render / Railway / Vercel / Fly.io
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    // NO pool — Render kills idle TCP; create fresh connection each time
    pool: false,
    // Debug in non-production
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production',
  };
}

const transporter = nodemailer.createTransport(buildTransportConfig());

// ---------------------------------------------------------------------------
// Verify transporter — call from server.js on startup
// ---------------------------------------------------------------------------
export const verifyTransporter = async () => {
  const maskedUser = SMTP_USER
    ? SMTP_USER.replace(/^(.{2})(.*)(@.*)$/, '$1***$3')
    : '(not set)';
  const maskedPass = SMTP_PASS ? '****' : '(not set)';

  console.log(`[SMTP] host=${SMTP_HOST} port=${SMTP_PORT} secure=${SMTP_SECURE} user=${maskedUser} pass=${maskedPass}`);

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[SMTP] ⚠ SMTP credentials are missing — emails will NOT be sent.');
    console.warn('[SMTP]   Set EMAIL_USER and EMAIL_PASS in your Render environment variables.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[SMTP] ✓ Transporter verified — ready to send emails.');
    return true;
  } catch (err) {
    console.error(`[SMTP] ✗ Transporter verification failed: ${err.message}`);
    console.error(`[SMTP]   code=${err.code || 'N/A'} command=${err.command || 'N/A'}`);

    // If port 587 failed, suggest 465
    if (SMTP_PORT === 587) {
      console.error('[SMTP]   TIP: Try setting EMAIL_PORT=465 and EMAIL_SECURE=true in Render env vars.');
    }
    return false;
  }
};

// ---------------------------------------------------------------------------
// Send mail — with retry and fresh-transporter fallback
// ---------------------------------------------------------------------------
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const sendMail = async ({ to, subject, text, html }) => {
  const from = `"${process.env.EMAIL_FROM_NAME || 'Urban Local Bodies'}" <${process.env.EMAIL_FROM_ADDRESS || SMTP_USER}>`;

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // On retry #2, create a completely fresh transporter (avoids stale socket)
      const transport = attempt >= 2
        ? nodemailer.createTransport(buildTransportConfig())
        : transporter;

      const info = await transport.sendMail({ from, to, subject, text, html });
      console.log(`[SMTP] Email sent to ${to} (messageId=${info.messageId}, attempt=${attempt + 1})`);

      // Close the one-off transporter if we created one
      if (attempt >= 2) transport.close();

      return info;
    } catch (err) {
      lastError = err;
      const isRetryable = ['ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'].includes(err.code);

      console.warn(`[SMTP] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${err.message} (code=${err.code || 'N/A'})`);

      if (isRetryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`[SMTP] All attempts exhausted for ${to}`);
        break;
      }
    }
  }

  throw lastError;
};

// ---------------------------------------------------------------------------
// SMTP diagnostic — attach to a route for production debugging
// ---------------------------------------------------------------------------
export const smtpDiagnostics = async () => {
  const maskedUser = SMTP_USER
    ? SMTP_USER.replace(/^(.{2})(.*)(@.*)$/, '$1***$3')
    : '(not set)';

  const result = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: maskedUser,
    credentialsSet: !!(SMTP_USER && SMTP_PASS),
    verified: false,
    error: null,
  };

  if (!SMTP_USER || !SMTP_PASS) {
    result.error = 'SMTP credentials missing. Set EMAIL_USER and EMAIL_PASS in Render environment variables.';
    return result;
  }

  try {
    const freshTransport = nodemailer.createTransport(buildTransportConfig());
    await freshTransport.verify();
    freshTransport.close();
    result.verified = true;
  } catch (err) {
    result.error = `${err.message} (code=${err.code || 'N/A'})`;
  }

  return result;
};

export { transporter };
