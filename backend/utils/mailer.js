import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // your SMTP username
    pass: process.env.EMAIL_PASS, // your SMTP password
  },
});

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'HTCMS Notification'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
};

export { transporter };
