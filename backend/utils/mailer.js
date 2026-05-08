import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Resend Email Client — production-ready HTTP-based email API
// ---------------------------------------------------------------------------
// Resend uses HTTP APIs (not SMTP), so there are NO port/firewall/timeout
// issues on Render, Vercel, Railway, or any cloud host.
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM
  || (process.env.EMAIL_FROM_NAME && process.env.EMAIL_FROM_ADDRESS
    ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`
    : 'HTCMS <onboarding@resend.dev>');

let resend = null;

function getClient() {
  if (!resend && RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
  }
  return resend;
}

// ---------------------------------------------------------------------------
// Verify email service — call from server.js on startup
// ---------------------------------------------------------------------------
export const verifyEmailService = async () => {
  const maskedKey = RESEND_API_KEY
    ? `${RESEND_API_KEY.slice(0, 8)}...${RESEND_API_KEY.slice(-4)}`
    : '(not set)';

  console.log(`[EMAIL] provider=Resend apiKey=${maskedKey} from=${EMAIL_FROM}`);

  if (!RESEND_API_KEY) {
    console.warn('[EMAIL] ⚠ RESEND_API_KEY is missing — emails will NOT be sent.');
    console.warn('[EMAIL]   Set RESEND_API_KEY in your environment variables.');
    return false;
  }

  try {
    // Verify by listing API keys (lightest possible API call)
    const client = getClient();
    await client.apiKeys.list();
    console.log('[EMAIL] ✓ Resend API connected — ready to send emails.');
    return true;
  } catch (err) {
    console.error(`[EMAIL] ✗ Resend verification failed: ${err.message}`);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Send mail — compatible signature with the old mailer (drop-in replacement)
// ---------------------------------------------------------------------------
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const sendMail = async ({ to, subject, text, html }) => {
  const client = getClient();

  if (!client) {
    console.error('[EMAIL] Cannot send email — RESEND_API_KEY is not configured.');
    throw new Error('Email service not configured');
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await client.emails.send({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html,
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log(`[EMAIL] Sent to ${to} (id=${data?.id}, attempt=${attempt + 1})`);
      return data;
    } catch (err) {
      lastError = err;
      const msg = err.message || '';

      console.warn(`[EMAIL] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${msg}`);

      // Retry on transient/network errors, not on auth/validation errors
      const isNonRetryable = msg.includes('API key') || msg.includes('validation') || msg.includes('not verified');
      if (!isNonRetryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`[EMAIL] All attempts exhausted for ${to}`);
        break;
      }
    }
  }

  throw lastError;
};

// ---------------------------------------------------------------------------
// Email diagnostic — attach to a route for production debugging
// ---------------------------------------------------------------------------
export const emailDiagnostics = async () => {
  const maskedKey = RESEND_API_KEY
    ? `${RESEND_API_KEY.slice(0, 8)}...${RESEND_API_KEY.slice(-4)}`
    : '(not set)';

  const result = {
    provider: 'Resend',
    apiKey: maskedKey,
    from: EMAIL_FROM,
    configured: !!RESEND_API_KEY,
    verified: false,
    error: null,
  };

  if (!RESEND_API_KEY) {
    result.error = 'RESEND_API_KEY is missing. Set it in your environment variables.';
    return result;
  }

  try {
    const client = getClient();
    await client.apiKeys.list();
    result.verified = true;
  } catch (err) {
    result.error = err.message;
  }

  return result;
};
