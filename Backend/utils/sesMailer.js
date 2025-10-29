import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const sesRegion = process.env.AWS_REGION;
const sesFrom = process.env.SES_FROM;

function getSESClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !sesRegion) {
    throw new Error('Missing AWS SES credentials or region configuration');
  }
  return new SESv2Client({ region: sesRegion });
}

export async function sendPasswordResetCodeSES(to, code) {
  const subject = 'Your ChillBoard password reset code';
  const text = `Your one-time code is: ${code}. It expires in 10 minutes.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
    <h2>ChillBoard Password Reset</h2>
    <p>Your one-time code is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
    <p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
  </div>`;

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
