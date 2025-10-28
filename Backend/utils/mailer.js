import nodemailer from 'nodemailer';

// Configure using environment variables. Do NOT commit secrets.
// Example:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_SECURE=false
// SMTP_USER=your_username
// SMTP_PASS=your_password
// SMTP_FROM="ChillBoard <no-reply@yourdomain.com>"

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const secure = process.env.SMTP_SECURE === 'true' ? true : false; // true for 465, false for 587
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || 'ChillBoard <no-reply@localhost>';

let transporter = null;

export function getTransporter() {
  if (!transporter) {
    if (!host || !user || !pass) {
      throw new Error('SMTP is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS');
    }
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendPasswordResetCode(to, code) {
  const t = getTransporter();
  const subject = 'Your ChillBoard password reset code';
  const text = `Your one-time code is: ${code}. It expires in 10 minutes.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
    <h2>ChillBoard Password Reset</h2>
    <p>Your one-time code is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
    <p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
  </div>`;
  await t.sendMail({ from, to, subject, text, html });
}
