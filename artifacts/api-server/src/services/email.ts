import { logger } from "../lib/logger.js";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  // In dev: log email to console (Mailpit would pick this up in real environment)
  logger.info({
    email: true,
    to: opts.to,
    subject: opts.subject,
    from: opts.from ?? "noreply@foundry-iam.local",
  }, "Email sent (dev mode — logged only)");

  // SMTP delivery is handled out-of-band via a relay; in this environment we log only.
  // To wire real delivery, set SMTP_HOST and install nodemailer separately.
}

export function inviteEmail(opts: {
  inviteeEmail: string;
  inviterName: string;
  tenantName: string;
  inviteToken: string;
  baseUrl: string;
}): EmailOptions {
  const link = `${opts.baseUrl}/accept-invite?token=${opts.inviteToken}`;
  return {
    to: opts.inviteeEmail,
    subject: `You've been invited to ${opts.tenantName} on Foundry IAM`,
    html: `
      <h2>You've been invited</h2>
      <p>${opts.inviterName} has invited you to join <strong>${opts.tenantName}</strong> on Foundry IAM.</p>
      <p><a href="${link}" style="background:#0f172a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  };
}
