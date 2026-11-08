/**
 * Apple configuration profile subscribing to several calendars at once.
 * Opening it on an iPhone or a Mac adds every calendar in one go instead of
 * one subscription per color.
 */

export interface ProfileCalendar {
  key: string;
  name: string;
  url: string;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Deterministic UUID, so installing the profile again replaces the previous one. */
async function uuidFrom(seed: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed))).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toUpperCase();
}

const entry = (key: string, value: string) => `<key>${key}</key><string>${escapeXml(value)}</string>`;

export async function buildProfile(options: {
  identifier: string;
  name: string;
  calendars: ProfileCalendar[];
}): Promise<string> {
  const payloads = await Promise.all(
    options.calendars.map(async (cal) => {
      const url = new URL(cal.url);
      return [
        "<dict>",
        entry("PayloadType", "com.apple.subscribedcalendar.account"),
        "<key>PayloadVersion</key><integer>1</integer>",
        entry("PayloadIdentifier", `${options.identifier}.${cal.key}`),
        entry("PayloadUUID", await uuidFrom(`${options.identifier}.${cal.key}`)),
        entry("PayloadDisplayName", cal.name),
        entry("SubCalAccountDescription", cal.name),
        entry("SubCalAccountHostName", `${url.host}${url.pathname}`),
        `<key>SubCalAccountUseSSL</key><${url.protocol === "https:"}/>`,
        "</dict>",
      ].join("");
    }),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    `<key>PayloadContent</key><array>${payloads.join("")}</array>`,
    entry("PayloadDisplayName", options.name),
    entry("PayloadDescription", "Abonnements aux calendriers générés par SchedulePilot."),
    entry("PayloadIdentifier", options.identifier),
    entry("PayloadOrganization", "SchedulePilot"),
    entry("PayloadType", "Configuration"),
    entry("PayloadUUID", await uuidFrom(options.identifier)),
    "<key>PayloadVersion</key><integer>1</integer>",
    "<key>PayloadRemovalDisallowed</key><false/>",
    "</dict></plist>",
  ].join("\n");
}
