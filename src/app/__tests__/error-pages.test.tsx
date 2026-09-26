// The error screens. Security System §15: nothing from the error reaches the
// page but its digest, and the visitor always has a way forward.
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "../error";
import GlobalError from "../global-error";

const error = (message: string, digest?: string) =>
  Object.assign(new Error(message), digest ? { digest } : {});

describe("error.tsx", () => {
  it("says what happened in one plain heading", () => {
    render(<ErrorPage error={error("boom")} retry={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Something went wrong on our side",
    );
  });

  it("never shows the error's message or stack", () => {
    const e = error("lead nadia@example.com failed at /secret/path");
    render(<ErrorPage error={e} retry={() => {}} />);
    expect(document.body.textContent).not.toContain("nadia@example.com");
    expect(document.body.textContent).not.toContain("/secret/path");
    expect(document.body.textContent).not.toContain("at ");
  });

  it("shows the digest as a reference, which matches the server log", () => {
    render(<ErrorPage error={error("boom", "abc123")} retry={() => {}} />);
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
  });

  it("shows no reference line when there is no digest", () => {
    render(<ErrorPage error={error("boom")} retry={() => {}} />);
    expect(screen.queryByText(/Reference:/)).toBeNull();
  });

  it("retries when asked", () => {
    const retry = jest.fn();
    render(<ErrorPage error={error("boom")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("offers the phone, WhatsApp and email channels", () => {
    render(<ErrorPage error={error("boom")} retry={() => {}} />);
    expect(screen.getByRole("link", { name: "+971 54 375 5150" })).toHaveAttribute(
      "href",
      "tel:+971543755150",
    );
    const whatsapp = screen.getByRole("link", { name: "WhatsApp" });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "contact@mapletech.ae" })).toHaveAttribute(
      "href",
      "mailto:contact@mapletech.ae",
    );
  });

  it("labels its section with the heading", () => {
    render(<ErrorPage error={error("boom")} retry={() => {}} />);
    expect(
      screen.getByRole("region", { name: "Something went wrong on our side" }),
    ).toBeInTheDocument();
  });
});

describe("global-error.tsx", () => {
  const markup = (e: Error & { digest?: string }) =>
    renderToStaticMarkup(<GlobalError error={e} retry={() => {}} />);

  it("renders a whole document, since it replaces the root layout", () => {
    const html = markup(error("boom"));
    expect(html).toMatch(/^<html lang="en" dir="ltr">/);
    expect(html).toContain("<body");
    expect(html).toContain("<title>Something went wrong | Smarthaus</title>");
  });

  it("gives the phone and email, and a way to retry", () => {
    const html = markup(error("boom"));
    expect(html).toContain('href="tel:+971543755150"');
    expect(html).toContain('href="mailto:contact@mapletech.ae"');
    expect(html).toContain(">Try again</button>");
  });

  it("never shows the error's message, only its digest", () => {
    const html = markup(error("nadia@example.com broke it", "d1g3st"));
    expect(html).not.toContain("nadia@example.com");
    expect(html).toContain("Reference: d1g3st");
  });

  it("omits the reference without a digest", () => {
    expect(markup(error("boom"))).not.toContain("Reference:");
  });

  it("retries when its button is pressed", () => {
    // Walked as an element tree rather than rendered: a second <html> inside
    // the test document is invalid markup and React would warn.
    type Node = React.ReactElement<{ children?: unknown; onClick?: () => void }>;
    const find = (node: unknown): Node | undefined => {
      if (Array.isArray(node)) return node.map(find).find(Boolean);
      if (!node || typeof node !== "object" || !("props" in node)) return undefined;
      const element = node as Node;
      if (element.type === "button") return element;
      return find(element.props.children);
    };
    const retry = jest.fn();
    const button = find(GlobalError({ error: error("boom"), retry }));
    expect(button).toBeDefined();
    button!.props.onClick!();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("the e2e error route", () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
  });

  it("is a 404 outside Playwright", async () => {
    process.env = { ...env };
    delete process.env.PLAYWRIGHT;
    const { default: E2EError } = await import("../e2e-error/page");
    expect(() => E2EError()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("throws under Playwright, so the boundary can be tested", async () => {
    process.env = { ...env, PLAYWRIGHT: "1" };
    const { default: E2EError } = await import("../e2e-error/page");
    expect(() => E2EError()).toThrow("e2e: the error boundary under test");
  });

  it("renders per request, never at build", async () => {
    const { dynamic } = await import("../e2e-error/page");
    expect(dynamic).toBe("force-dynamic");
  });
});
