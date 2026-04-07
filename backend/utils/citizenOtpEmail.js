/**
 * HTML + plain text for citizen OTP emails (registration + login).
 * Logo URL must be absolute for email clients (use FRONTEND_URL or PUBLIC_APP_URL).
 */
function getPublicOrigin() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    'https://ulbsystemm.vercel.app';
  return String(raw).replace(/\/$/, '');
}

export function buildCitizenOtpEmail({ otpCode, title, introText, minutesValid = 15 }) {
  const origin = getPublicOrigin();
  const logoUrl = `${origin}/ULB%20Logo.png`;

  const subject = title || 'Urban Local Bodies — verification code';

  const text = [
    'Urban Local Bodies (ULB)',
    '',
    introText || 'Use the code below to continue.',
    '',
    `Your code: ${otpCode}`,
    '',
    `This code expires in ${minutesValid} minutes.`,
    '',
    'If you did not request this, you can ignore this email.'
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
          <tr>
            <td style="padding:28px 32px 8px;text-align:center;background:linear-gradient(180deg,#faf5ff 0%,#ffffff 100%);">
              <img src="${logoUrl}" alt="ULB" width="72" height="72" style="display:block;margin:0 auto 12px;object-fit:contain;" />
              <div style="font-size:20px;font-weight:700;color:#6d28d9;letter-spacing:0.02em;">Urban Local Bodies</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">Citizen portal — secure verification</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
                ${introText || 'Use the code below to continue.'}
              </p>
              <div style="text-align:center;margin:24px 0;">
                <span style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:0.35em;color:#1e1b4b;background:#f5f3ff;padding:16px 28px;border-radius:12px;border:1px solid #ddd6fe;">
                  ${otpCode}
                </span>
              </div>
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                This code expires in <strong>${minutesValid} minutes</strong>. Do not share it with anyone.
              </p>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
                If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
              Urban Local Bodies &middot; Tax &amp; citizen services
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject, text, html };
}
