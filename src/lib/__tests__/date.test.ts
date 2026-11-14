import { formatDate } from "../date";
import { formatDate as legalFormatDate } from "../../components/LegalPage/LegalDocumentPage";

/**
 * One way to print a date, shared by the legal pages and the blog. It reads an
 * ISO date as a calendar day, not an instant: a date published in Dubai must
 * not print as the day before for a visitor west of it.
 */
describe("formatDate", () => {
  it.each([
    ["2026-11-12", "12 November 2026"],
    ["2026-11-05", "5 November 2026"],
    ["2026-10-29", "29 October 2026"],
    ["2026-01-01", "1 January 2026"],
    ["2026-12-31", "31 December 2026"],
    ["2024-02-29", "29 February 2024"],
  ])("prints %s as %s", (iso, printed) => {
    expect(formatDate(iso)).toBe(printed);
  });

  it("prints the day first and the month in words, as the site writes dates", () => {
    expect(formatDate("2026-03-04")).toMatch(/^4 March 2026$/);
  });

  it("does not shift the day with the reader's time zone", () => {
    const zone = process.env.TZ;
    try {
      for (const tz of ["Pacific/Honolulu", "Asia/Dubai", "Pacific/Kiritimati"]) {
        process.env.TZ = tz;
        expect(formatDate("2026-11-12")).toBe("12 November 2026");
      }
    } finally {
      process.env.TZ = zone;
    }
  });

  it("is the one the legal pages print with", () => {
    expect(legalFormatDate).toBe(formatDate);
  });
});
