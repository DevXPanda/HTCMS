import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const OTP_LENGTH = 6;

export function generateNumericOtp() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(OTP_LENGTH, '0');
}

export async function hashOtp(plain) {
  const salt = await bcrypt.genSalt(8);
  return bcrypt.hash(String(plain), salt);
}

export async function compareOtp(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(String(plain), hash);
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return 'your email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `***@${domain}`;
  return `${local[0]}***${local.slice(-1)}@${domain}`;
}
