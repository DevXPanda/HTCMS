import { sequelize } from '../config/database.js';

/**
 * Adds citizen OTP / email verification columns if missing.
 * Safe when NODE_ENV is unset (npm run dev) and full sequelize.sync({ alter }) did not run.
 */
export async function ensureUserOtpColumns() {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') {
    return;
  }

  const statements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "registrationOtpHash" VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "registrationOtpExpiresAt" TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "loginOtpHash" VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "loginOtpExpiresAt" TIMESTAMP WITH TIME ZONE`
  ];

  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ensureUserOtpColumns]', e.message);
      }
    }
  }
}
