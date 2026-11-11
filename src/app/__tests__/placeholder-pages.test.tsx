// The three pages that are still placeholders. Each must render the shared
// coming-soon panel with its own blurb, and stay out of search until it ships.
// ComingSoon has its own suite; here it only records what it was given.
import { screen } from "@testing-library/react";
import type { Metadata } from "next";
import type { ComponentType } from "react";

import DesignersPage, { generateMetadata as designers } from "../designers/page";
import DevelopersPage, { generateMetadata as developers } from "../developers/page";
import SolutionsPage, { generateMetadata as solutions } from "../solutions/page";
import { renderServer } from "../../__tests__/helpers/server";

jest.mock("../../components/ComingSoon", () => ({
  ComingSoon: ({ blurb }: { blurb: string }) => <p data-testid="coming-soon">{blurb}</p>,
}));

// Each page's blurb and metadata are its comingSoonPage document in Sanity;
// the seed stands in for it here.
const PAGES: [string, ComponentType, () => Promise<Metadata>, RegExp][] = [
  ["/designers", DesignersPage, designers, /interior designers/],
  ["/developers", DevelopersPage, developers, /development pricing/],
  ["/solutions", SolutionsPage, solutions, /room by room/],
];

describe.each(PAGES)("%s", (path, Page, generateMetadata, topic) => {
  it("renders the coming-soon panel once, with a blurb about its own topic", async () => {
    await renderServer(<Page />);
    const panels = screen.getAllByTestId("coming-soon");
    expect(panels).toHaveLength(1);
    expect(panels[0]).toHaveTextContent(topic);
  });

  it("is noindex, and canonical to its own path", async () => {
    const metadata = await generateMetadata();
    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.alternates?.canonical).toBe(path);
  });
});
