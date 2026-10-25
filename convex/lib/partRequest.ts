import { SITE_NAME, emailLayout, escapeHtml } from "./email";

export const MAX_PHOTOS = 3;
// Photos are shrunk in the browser first, so this is generous.
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export interface PartRequest {
  name: string;
  email: string;
  phone?: string;
  vehicle?: string;
  vin?: string;
  partNumber?: string;
  description: string;
  photos: Array<{ type: string; data: string }>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Checks and tidies a submitted part request; returns an error message for the customer when it can't be sent. */
export function parsePartRequest(body: unknown): { request: PartRequest } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request" };
  const raw = body as Record<string, unknown>;
  // Bots fill in every field, including this hidden one.
  if (text(raw.website, 200)) return { error: "Invalid request" };

  const name = text(raw.name, 120);
  const email = text(raw.email, 254)?.toLowerCase();
  const description = text(raw.description, 3000);
  const partNumber = text(raw.partNumber, 100);
  if (!name) return { error: "Please enter your name" };
  if (!email || !EMAIL_PATTERN.test(email)) return { error: "Please enter a valid email address" };
  if (!description && !partNumber) return { error: "Tell us which part you need, or its part number" };

  const vin = text(raw.vin, 40)?.toUpperCase().replace(/\s/g, "");
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return { error: "A VIN is 17 letters and numbers (no I, O or Q)" };

  const photos: PartRequest["photos"] = [];
  const rawPhotos = Array.isArray(raw.photos) ? raw.photos : [];
  if (rawPhotos.length > MAX_PHOTOS) return { error: `Please add at most ${MAX_PHOTOS} photos` };
  for (const photo of rawPhotos) {
    const { type, data } = (photo ?? {}) as { type?: unknown; data?: unknown };
    if (typeof type !== "string" || !PHOTO_TYPES[type] || typeof data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      return { error: "Photos must be JPEG, PNG or WebP images" };
    }
    if ((data.length * 3) / 4 > MAX_PHOTO_BYTES) return { error: "One of the photos is too large" };
    photos.push({ type, data });
  }

  return {
    request: {
      name,
      email,
      phone: text(raw.phone, 40),
      vehicle: text(raw.vehicle, 200),
      vin,
      partNumber,
      description: description ?? "",
      photos,
    },
  };
}

/** The email the shop gets for a part request; replying goes straight to the customer. */
export function partRequestEmail(request: PartRequest) {
  const rows: Array<[string, string | undefined]> = [
    ["Name", request.name],
    ["Email", request.email],
    ["Phone", request.phone],
    ["Vehicle", request.vehicle],
    ["VIN", request.vin],
    ["Part number", request.partNumber],
  ];
  const filled = rows.filter((row): row is [string, string] => Boolean(row[1]));
  const subject = `Part request: ${request.partNumber ?? request.description.slice(0, 60)}${request.vehicle ? ` (${request.vehicle})` : ""}`;

  const body = `
        <p style="font-size:18px;font-weight:bold;color:#111827;margin:0 0 16px">Part request from the website</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px;color:#111827;margin:0 0 16px">
          ${filled.map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">${label}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`).join("")}
        </table>
        ${request.description ? `<p style="font-size:14px;color:#111827;margin:0 0 16px;white-space:pre-wrap">${escapeHtml(request.description)}</p>` : ""}
        <p style="font-size:14px;color:#6b7280;margin:0">${request.photos.length ? `${request.photos.length} photo(s) attached.` : "No photos."} Reply to this email to answer the customer.</p>`;

  return {
    subject,
    html: emailLayout(body, `Sent by the "Can't find your part?" form on the ${escapeHtml(SITE_NAME)} website.`),
    text: [
      "Part request from the website",
      "",
      ...filled.map(([label, value]) => `${label}: ${value}`),
      "",
      request.description,
      "",
      request.photos.length ? `${request.photos.length} photo(s) attached.` : "No photos.",
    ].join("\n"),
    attachments: request.photos.map((photo, i) => ({
      filename: `part-photo-${i + 1}.${PHOTO_TYPES[photo.type]}`,
      content: photo.data,
    })),
  };
}
