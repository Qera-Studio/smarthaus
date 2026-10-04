// The four pages that are still placeholders. Each must render the shared
// coming-soon panel with its own blurb, and stay out of search until it ships.
// ComingSoon has its own suite; here it only records what it was given.
import { render, screen } from "@testing-library/react";
import type { Metadata } from "next";
import type { ComponentType } from "react";

import AboutPage, { metadata as about } from "../about/page";
import DesignersPage, { metadata as designers } from "../designers/page";
import DevelopersPage, { metadata as developers } from "../developers/page";
import SolutionsPage, { metadata as solutions } from "../solutions/page";

jest.mock("../../components/ComingSoon", () => ({
  ComingSoon: ({ blurb }: { blurb: string }) => <p data-testid="coming-soon">{blurb}</p>,
}));

const PAGES: [string, ComponentType, Metadata, RegExp][] = [
  ["/about", AboutPage, about, /Maple Technologies/],
  ["/designers", DesignersPage, designers, /interior designers/],
  ["/developers", DevelopersPage, developers, /development pricing/],
  ["/solutions", SolutionsPage, solutions, /room by room/],
];

describe.each(PAGES)("%s", (path, Page, metadata, topic) => {
  it("renders the coming-soon panel once, with a blurb about its own topic", () => {
    render(<Page />);
    const panels = screen.getAllByTestId("coming-soon");
    expect(panels).toHaveLength(1);
    expect(panels[0]).toHaveTextContent(topic);
  });

  it("is noindex, and canonical to its own path", () => {
    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.alternates?.canonical).toBe(path);
  });
});
