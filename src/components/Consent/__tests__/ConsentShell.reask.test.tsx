// The banner's two re-ask lines, the only two permitted (consent deck §10):
// a stored choice that has expired, and one made against an older notice.
// The wording is the consent document in Sanity; the seed stands in.
import { render, screen } from "@testing-library/react";
import { ConsentShell } from "../ConsentShell";
import { buildConsentRecord, serialiseConsentCookie } from "../../../lib/consent";
import { CONSENT_COPY } from "../../../../sanity/seed/consent-copy";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

const originalRO = window.ResizeObserver;

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  window.ResizeObserver = originalRO;
  document.cookie = "smarthaus_consent=; max-age=0; path=/";
});

function store(record: ReturnType<typeof buildConsentRecord>) {
  document.cookie = serialiseConsentCookie(record, { secure: false });
}

function renderBanner() {
  render(
    <ConsentShell
      copy={CONSENT_COPY}
      intro={<p>intro</p>}
      panelIntro={<p>panel</p>}
      essential={<p>essential</p>}
      analytics={<p>analytics</p>}
      withdraw={<p>withdraw</p>}
      idPrefix="r"
    />,
  );
}

describe("the banner's re-ask line", () => {
  it("says it has been a while, for a choice that has expired", async () => {
    store({ ...buildConsentRecord(true, "explicit"), timestamp: "2020-01-01T00:00:00.000Z" });
    renderBanner();
    expect(await screen.findByText(CONSENT_COPY.state.expired)).toBeInTheDocument();
    expect(screen.queryByText(CONSENT_COPY.state.changed)).not.toBeInTheDocument();
  });

  it("says a tool was added, for a choice made against an older notice", async () => {
    store({ ...buildConsentRecord(true, "explicit"), version: "0.9.0" });
    renderBanner();
    expect(await screen.findByText(CONSENT_COPY.state.changed)).toBeInTheDocument();
    expect(screen.queryByText(CONSENT_COPY.state.expired)).not.toBeInTheDocument();
  });

  it("says neither to a first-time visitor", async () => {
    renderBanner();
    await screen.findByRole("button", { name: CONSENT_COPY.banner.accept });
    expect(screen.queryByText(CONSENT_COPY.state.expired)).not.toBeInTheDocument();
    expect(screen.queryByText(CONSENT_COPY.state.changed)).not.toBeInTheDocument();
  });
});
