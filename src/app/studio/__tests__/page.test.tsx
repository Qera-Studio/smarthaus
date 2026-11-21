import { render } from "@testing-library/react";

// next-sanity and sanity are ESM that Jest cannot load. The stand-ins record
// what the page hands them; e2e/studio.spec.ts covers the real Studio.
const received: unknown[] = [];
jest.mock("next-sanity/studio", () => ({
  metadata: { referrer: "same-origin", robots: "noindex" },
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" },
}));
jest.mock("next-sanity/studio/client-component", () => ({
  NextStudio: (props: { config: unknown }) => {
    received.push(props.config);
    return <div data-testid="studio" />;
  },
}));
jest.mock("../../../sanity/config", () => ({ __esModule: true, default: { basePath: "/studio" } }));

import StudioPage, { dynamic, metadata, viewport } from "../[[...tool]]/page";

describe("the Studio page", () => {
  beforeEach(() => {
    received.length = 0;
  });

  it("renders the Studio inside the data-studio marker that hides the site chrome", () => {
    const { container, getByTestId } = render(<StudioPage />);
    const marker = container.querySelector("[data-studio]");
    expect(marker).not.toBeNull();
    expect(marker).toContainElement(getByTestId("studio"));
  });

  it("hands the Studio the project's config", () => {
    render(<StudioPage />);
    expect(received).toEqual([{ basePath: "/studio" }]);
  });

  it("is noindex and sends no full referrer, as next-sanity sets them", () => {
    expect(metadata.robots).toBe("noindex");
    expect(metadata.referrer).toBe("same-origin");
  });

  it("is titled Studio, so the tab reads 'Studio | Smarthaus'", () => {
    expect(metadata.title).toBe("Studio");
  });

  it("is prerendered: the Studio runs in the browser, the server has nothing to do", () => {
    expect(dynamic).toBe("force-static");
  });

  it("passes next-sanity's viewport through", () => {
    expect(viewport).toEqual({ width: "device-width", initialScale: 1, viewportFit: "cover" });
  });
});
