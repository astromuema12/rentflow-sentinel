export class EmailDeliveryError extends Error {
  constructor() {
    super("Password reset email could not be delivered.");
    this.name = "EmailDeliveryError";
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new EmailDeliveryError();
  }

  const detail = resetUrl
    ? `To reset your password, open this link within 30 minutes: ${resetUrl}`
    : "If you have a RentFlow Sentinel account, no further action is needed.";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "RentFlow Sentinel password reset",
      text: `A password reset was requested for this email address. ${detail}\n\nIf you did not request this, you can ignore this message.`,
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
