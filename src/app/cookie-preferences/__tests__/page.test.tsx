import { screen } from "@testing-library/react";

import CookiePreferencesPage, { generateMetadata } from "../page";
import { renderServer } from "../../../__tests__/helpers/server";

/**
 * The permanent route back into the cookie controls (Legal System §6:
 * withdrawal as easy as consent). The controls themselves are the Consent
 * component's suite; this one holds what the page adds: its heading, the
 * standalone placement, and the noindex that waits on counsel.
 */

// The `mock` prefix is what jest allows a hoisted factory to reference.
const mockConsent = jest.fn((props: { standalone?: boolean }) => {
  void props;
  return <div data-testid="consent" />;
});
jest.mock("../../../components/Consent", () => ({
  Consent: (props: { standalone?: boolean }) => mockConsent(props),
}));

describe("/cookie-preferences", () => {
  let metadata: Awaited<ReturnType<typeof generateMetadata>>;
  beforeAll(async () => {
    metadata = await generateMetadata();
  });
  beforeEach(() => mockConsent.mockClear());

  it("names the page with its one h1", async () => {
    await renderServer(<CookiePreferencesPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cookie preferences");
  });

  it("renders the banner's own controls in place, with nothing to dismiss", async () => {
    // One implementation, two placements: the page and the banner must not
    // drift into two versions of the counsel-pending copy.
    await renderServer(<CookiePreferencesPage />);
    expect(screen.getByTestId("consent")).toBeInTheDocument();
    expect(mockConsent).toHaveBeenCalledTimes(1);
    expect(mockConsent.mock.calls[0]![0]).toEqual({ standalone: true });
  });

  it("stays out of search until the privacy policy and terms are reviewed", async () => {
    // All three move together: see the TO PUBLISH note in the page.
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("canonicalises to its own path", async () => {
    expect(metadata.alternates?.canonical).toMatch(/\/cookie-preferences$/);
  });

  it("says what the page does, and that analytics starts off", async () => {
    expect(metadata.description).toMatch(/off until you turn it on/);
  });
});
