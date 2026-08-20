import { Resend } from "resend";

export async function sendAdminDepositAlert(input: {
  userEmail: string;
  packageLabel: string;
  riskTier: string;
  currency: string;
  amountUsd: number;
  txHash: string;
  reviewUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !to) {
    console.warn("Resend skipped: RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL missing");
    return;
  }

  const resend = new Resend(apiKey);
  const text = [
    "New deposit submitted for review",
    "",
    `User: ${input.userEmail}`,
    `Package: ${input.packageLabel} (${input.riskTier})`,
    `Currency: ${input.currency}`,
    `Amount (expected): $${input.amountUsd.toFixed(2)}`,
    `Tx hash: ${input.txHash}`,
    "",
    `Review: ${input.reviewUrl}`,
  ].join("\n");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "XAUPower <onboarding@resend.dev>",
    to,
    subject: `Deposit review: ${input.packageLabel} ${input.riskTier}`,
    text,
  });
}
