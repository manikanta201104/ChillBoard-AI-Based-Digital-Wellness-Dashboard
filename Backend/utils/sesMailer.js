import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const sesRegion = process.env.AWS_REGION;
const sesFrom = process.env.SES_FROM;

function parseFrom(fromStr) {
  if (!fromStr) return { email: 'no-reply@localhost', name: 'ChillBoard' };
  const m = fromStr.match(/^(.+)\s<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { email: fromStr.trim(), name: 'ChillBoard' };
}

function buildResetEmail(code) {
  const subject = 'Your ChillBoard password reset code';
  const text = `Your one-time code is: ${code}. It expires in 10 minutes.`;
  const html = `
  <div style="font-family:Inter,Segoe UI,Arial,Helvetica,sans-serif;background:#0f172a;margin:0;padding:32px;color:#e2e8f0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#0b1220;border:1px solid #1f2937;border-radius:12px;overflow:hidden">
      <tr>
        <td style="padding:24px 24px 0 24px">
          <h1 style="margin:0;font-size:20px;line-height:28px;color:#f8fafc">ChillBoard Password Reset</h1>
          <p style="margin:8px 0 0 0;font-size:14px;color:#cbd5e1">Use the code below to reset your password. This code expires in 10 minutes.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px 8px 24px;text-align:center">
          <div style="display:inline-block;background:#111827;border:1px solid #374151;border-radius:10px;padding:14px 20px">
            <span style="font-size:28px;letter-spacing:8px;font-weight:700;color:#f8fafc">${code}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 24px 24px;color:#94a3b8;font-size:12px">
          <p style="margin:0">If you did not request this, you can safely ignore this email.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 24px;background:#0f172a;color:#64748b;font-size:11px;border-top:1px solid #1f2937">  ${new Date().getFullYear()} ChillBoard</td>
      </tr>
    </table>
  </div>`;
  return { subject, text, html };
}

function getSESClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !sesRegion) {
    throw new Error('Missing AWS SES credentials or region configuration');
  }
  return new SESv2Client({ region: sesRegion });
}

export async function sendPasswordResetCodeSES(to, code) {
  const { subject, text, html } = buildResetEmail(code);

  const client = getSESClient();
  const cmd = new SendEmailCommand({
    FromEmailAddress: sesFrom,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: {
          Text: { Data: text },
          Html: { Data: html },
        },
      },
    },
  });

  const resp = await client.send(cmd);
  return {
    messageId: resp?.MessageId,
    accepted: [to],
    response: 'Sent via AWS SES HTTPS API',
  };
}

export async function sendPasswordResetCodeResend(to, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  const { subject, text, html } = buildResetEmail(code);

  const from = process.env.SES_FROM || 'no-reply@localhost';
  const res = await globalThis.fetch('https://api.resend.com/emails', {
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
  const data = await res.json();
  return { messageId: data?.id, accepted: [to], response: 'Sent via Resend HTTP API' };
}

export async function sendPasswordResetCodeBrevo(to, code) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY missing');
  const { subject, text, html } = buildResetEmail(code);
  const { email: fromEmail, name: fromName } = parseFrom(process.env.SES_FROM || 'no-reply@localhost');
  const res = await globalThis.fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return { messageId: data?.messageId || data?.message || 'brevo', accepted: [to], response: 'Sent via Brevo API' };
}

export async function sendPasswordResetWithFallback(to, code) {
  // Try SES
  try {
    return await sendPasswordResetCodeSES(to, code);
  } catch (e1) {
    // Try Resend if configured
    if (process.env.RESEND_API_KEY) {
      try {
        return await sendPasswordResetCodeResend(to, code);
      } catch (e2) {
        // Fall through
      }
    }
    // Try Brevo if configured
    if (process.env.BREVO_API_KEY) {
      return await sendPasswordResetCodeBrevo(to, code);
    }
    throw e1;
  }
}
