/**
 * Opening hours: stored once in Sanity as days and 24-hour times
 * (siteSettings.contact.hours), shown in the footer as a line of copy and
 * given to search engines as OpeningHoursSpecification. One source, so the two
 * cannot disagree (SEO System §9: schema matches what the page shows).
 */

/** schema.org's day names, which are also how the Studio stores them. */
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** "09:00" as "9am", "18:30" as "6:30pm". */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/**
 * "Monday to Saturday, 9am to 6pm". A run of consecutive days is shown as its
 * ends; any other set is listed, in week order.
 */
export function formatHours({
  days,
  opens,
  closes,
}: {
  days: readonly Weekday[];
  opens: string;
  closes: string;
}): string {
  const index = [...new Set(days.map((day) => WEEKDAYS.indexOf(day)))].sort((a, b) => a - b);
  const run = index.length > 2 && index.every((d, i) => i === 0 || d === index[i - 1]! + 1);
  const named = index.map((d) => WEEKDAYS[d]!);
  const span = run ? `${named[0]} to ${named.at(-1)}` : named.join(", ");
  return `${span}, ${clock(opens)} to ${clock(closes)}`;
}
