import { SITE_NAME, emailLayout, escapeHtml } from "./email";

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Checks and tidies a contact form submission; returns an error message for the visitor when it can't be sent. */
export function parseContactMessage(body: unknown): { message: ContactMessage } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request" };
  const raw = body as Record<string, unknown>;
  // Bots fill in every field, including this hidden one.
  if (text(raw.website, 200)) return { error: "Invalid request" };

  const name = text(raw.name, 120);
  const email = text(raw.email, 254)?.toLowerCase();
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  if (!name) return { error: "Please enter your name" };
  if (!email || !EMAIL_PATTERN.test(email)) return { error: "Please enter a valid email address" };
  if (!message) return { error: "Please write a message" };
  if (message.length > 3000) return { error: "Please keep your message under 3000 characters" };
  return { message: { name, email, message } };
}

/** The email the shop gets for a contact form message; replying goes straight to the visitor. */
export function contactEmail(contact: ContactMessage) {
  const preview = contact.message.replace(/\s+/g, " ").slice(0, 60);
  const body = `
        <p style="font-size:18px;font-weight:bold;color:#111827;margin:0 0 16px">Message from the website</p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 16px">From ${escapeHtml(contact.name)} &lt;${escapeHtml(contact.email)}&gt;</p>
        <p style="font-size:15px;color:#111827;margin:0 0 16px;white-space:pre-wrap">${escapeHtml(contact.message)}</p>
        <p style="font-size:14px;color:#6b7280;margin:0">Reply to this email to answer ${escapeHtml(contact.name)}.</p>`;
  return {
    subject: `Website enquiry from ${contact.name}: ${preview}${contact.message.length > 60 ? "…" : ""}`,
    html: emailLayout(body, `Sent by the contact form on the ${escapeHtml(SITE_NAME)} website.`),
    text: [`Message from ${contact.name} <${contact.email}>`, "", contact.message, "", "Reply to this email to answer them."].join("\n"),
  };
}
