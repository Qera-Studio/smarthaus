import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolve } from "./resolve";

export { resolve };

/** render(), for a tree that holds async Server Components. */
export async function renderServer(ui: ReactNode): Promise<RenderResult> {
  return render(<>{await resolve(ui)}</>);
}

/** renderToStaticMarkup(), for a tree that holds async Server Components. */
export async function renderMarkup(ui: ReactNode): Promise<string> {
  return renderToStaticMarkup(<>{await resolve(ui)}</>);
}
