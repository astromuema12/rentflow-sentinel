export class EmailDeliveryError extends Error {
  constructor() {
    super("Password reset email could not be delivered.");
    this.name = "EmailDeliveryError";
  }
}

async function sendEmail(email: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new EmailDeliveryError();
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("Password reset email provider rejected the request.", {
      status: response.status,
    });
    throw new EmailDeliveryError();
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl?: string,
): Promise<void> {
  const detail = resetUrl
    ? `To reset your password, open this link within 30 minutes: ${resetUrl}`
    : "If you have a RentFlow Sentinel account, no further action is needed.";

  await sendEmail(
    email,
    "RentFlow Sentinel password reset",
    `A password reset was requested for this email address. ${detail}\n\nIf you did not request this, you can ignore this message.`,
  );
}

export async function sendOrganizationInvitationEmail(
  email: string,
  firstName: string,
  organizationName: string,
  invitationUrl: string,
): Promise<void> {
  await sendEmail(
    email,
    `Join ${organizationName} on RentFlow Sentinel`,
    `Hello ${firstName},\n\nYou have been invited to manage ${organizationName} on RentFlow Sentinel. To accept the invitation and set up your landlord account, open this link within 7 days: ${invitationUrl}\n\nIf you were not expecting this invitation, you can ignore this message.`,
  );
}
