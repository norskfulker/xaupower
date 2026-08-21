import { Resend } from "resend";

export async function sendUserDepositNotice(input: {
  to: string;
  amountUsd: number;
  currency: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "XAUPower <onboarding@resend.dev>",
    to: input.to,
    subject: "Deposit submitted for review",
    text: [
      "We received your deposit submission.",
      "",
      `Amount (expected): $${input.amountUsd.toFixed(2)} ${input.currency}`,
      "An admin will review the transaction hash before it is applied.",
    ].join("\n"),
  });
}

export async function sendUserPayoutNotice(input: {
  to: string;
  amountUsd: number;
  currency: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "XAUPower <onboarding@resend.dev>",
    to: input.to,
    subject: "Payout requested",
    text: [
      "Your payout request was submitted.",
      "",
      `Amount: $${input.amountUsd.toFixed(2)} ${input.currency}`,
      "An admin will review it before funds are sent.",
    ].join("\n"),
  });
}
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
