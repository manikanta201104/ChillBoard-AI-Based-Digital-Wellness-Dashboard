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
let from = process.env.SMTP_FROM || 'ChillBoard <no-reply@localhost>';
const enableDebug = process.env.SMTP_DEBUG === 'true';

// Basic validation: allow "Name <email@domain>" or plain email
const emailOnlyRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const displayEmailRe = /^.+\s<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
if (!(emailOnlyRe.test(from) || displayEmailRe.test(from))) {
  // Fallback to authenticated user which Gmail allows by default
  if (emailOnlyRe.test(user)) {
    from = user;
  } else {
    from = 'no-reply@localhost';
  }
}

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
      // Timeouts to prevent very long hangs
      connectionTimeout: 15000, // 15s
      greetingTimeout: 15000,   // 15s
      socketTimeout: 20000,     // 20s
      logger: enableDebug,
      debug: enableDebug,
      tls: {
        rejectUnauthorized: false, // allows Gmail cert chain variations
      },
    });
  }
  return transporter;
}

function createAltTransporter() {
  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS');
  }
  // Alternative SMTP attempt: port 465 with secure=true
  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    logger: enableDebug,
    debug: enableDebug,
    tls: { rejectUnauthorized: false },
  });
}

async function sendViaResend(to, subject, text, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function sendPasswordResetCode(to, code) {
  if (!to || !code) throw new Error('Missing email or code');
  
  const t = getTransporter();
  const subject = 'Your ChillBoard password reset code';
  const text = `Your one-time code is: ${code}. It expires in 10 minutes.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
    <h2>ChillBoard Password Reset</h2>
    <p>Your one-time code is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
    <p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
  </div>`;
  
  try {
    // Primary SMTP send (587)
    return await t.sendMail({ from, to, subject, text, html });
  } catch (err) {
    const msg = (err && err.message) || String(err);
    // Retry with alternative SMTP settings if connection-related
    if (/timeout|ECONNECTION|ETIMEDOUT|ENOTFOUND|ECONNRESET/i.test(msg)) {
      try {
        const alt = createAltTransporter();
        const info = await alt.sendMail({ from, to, subject, text, html });
        return info;
      } catch (err2) {
        // Fall through to HTTP provider if configured
        if (process.env.RESEND_API_KEY) {
          const info = await sendViaResend(to, subject, text, html);
          return { messageId: info?.id, accepted: [to], rejected: [], response: 'Sent via Resend API' };
        }
        throw err2;
      }
    }
    // For non-connection errors, bubble up
    throw err;
  }
}

