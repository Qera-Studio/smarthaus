import { clock, formatHours, WEEKDAYS } from "../hours";

/**
 * The opening hours as the footer shows them. One field in Sanity feeds both
 * this line and the business's structured data, so the formatting is the only
 * thing that can make them disagree.
 */
describe("clock", () => {
  it.each([
    ["09:00", "9am"],
    ["18:00", "6pm"],
    ["00:00", "12am"],
    ["12:00", "12pm"],
    ["12:30", "12:30pm"],
    ["09:05", "9:05am"],
    ["23:59", "11:59pm"],
  ])("reads %s as %s", (hhmm, shown) => {
    expect(clock(hhmm)).toBe(shown);
  });
});

describe("formatHours", () => {
  const hours = (days: (typeof WEEKDAYS)[number][]) => ({ days, opens: "09:00", closes: "18:00" });

  it("shows the seeded hours as Shivanshu gave them", () => {
    expect(
      formatHours(hours(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])),
    ).toBe("Monday to Saturday, 9am to 6pm");
  });

  it("shows a run of days by its ends, in week order whatever the stored order", () => {
    expect(formatHours(hours(["Friday", "Thursday", "Wednesday"]))).toBe(
      "Wednesday to Friday, 9am to 6pm",
    );
  });

  it("lists days that are not a run, and a run of two", () => {
    expect(formatHours(hours(["Monday", "Wednesday", "Friday"]))).toBe(
      "Monday, Wednesday, Friday, 9am to 6pm",
    );
    expect(formatHours(hours(["Saturday", "Sunday"]))).toBe("Saturday, Sunday, 9am to 6pm");
  });

  it("names a single day, and a whole week by its ends", () => {
    expect(formatHours(hours(["Sunday"]))).toBe("Sunday, 9am to 6pm");
    expect(formatHours(hours([...WEEKDAYS]))).toBe("Monday to Sunday, 9am to 6pm");
  });

  it("counts a day picked twice once", () => {
    expect(formatHours(hours(["Monday", "Monday", "Tuesday", "Wednesday"]))).toBe(
      "Monday to Wednesday, 9am to 6pm",
    );
  });
});
