/**
 * Tiny iCalendar (RFC 5545) generator. Just enough for VEVENT entries with
 * UID / DTSTART / DTEND / SUMMARY / LOCATION / DESCRIPTION / URL.
 *
 * No external dep — RFC line folding (>75 octets), CRLF terminators, and
 * proper text escaping baked in.
 */

export interface ICalEvent {
  uid: string;
  start: Date;
  end?: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function fold(line: string): string {
  // RFC 5545: lines must be <= 75 octets; continuation lines start with a space.
  const limit = 73;
  if (line.length <= limit) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const slice = line.slice(i, i + (i === 0 ? limit + 2 : limit));
    out.push(slice);
    i += slice.length;
  }
  return out.join("\r\n ");
}

export function buildIcs(
  calendarName: string,
  events: ICalEvent[]
): string {
  const now = fmtUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Underground Metal//Concerts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:UTC`,
  ];
  for (const ev of events) {
    const end = ev.end ?? new Date(ev.start.getTime() + 3 * 60 * 60 * 1000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmtUtc(ev.start)}`);
    lines.push(`DTEND:${fmtUtc(end)}`);
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
