import { act, fireEvent, render, screen } from "@testing-library/react";

import { HONEYPOT_FIELD, MAX_LENGTH } from "../../../lib/contact-fields";
import { HeroLead } from "../HeroLead";

/**
 * The hero's email field (2026-11-14). The server decides everything
 * (hero-lead.test.ts); what this pins is what a visitor meets: a field a
 * screen reader can name, the answer in words, the way to the full form after
 * a send, and a field that never loses what was typed.
 */

const submitHeroLead = jest.fn();
jest.mock("../../../app/contact/actions", () => ({
  submitHeroLead: (...args: unknown[]) => submitHeroLead(...args),
}));

const CTA = "Book a site visit";
const mount = () => render(<HeroLead cta={CTA} />);
const field = () => screen.getByRole("textbox", { name: "Email" });

async function send(value?: string) {
  if (value !== undefined) fireEvent.change(field(), { target: { value } });
  await act(async () => {
    fireEvent.submit(document.querySelector("form")!);
  });
}

beforeEach(() => submitHeroLead.mockReset());

describe("HeroLead, as it arrives", () => {
  it("is one email field, named for a screen reader though no label shows", () => {
    mount();
    const input = field();
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("id", "hero-email");
    expect(input).toHaveAttribute("name", "email");
    // The design's placeholder is what is seen; the label is read.
    expect(input).toHaveAttribute("placeholder", "Enter email");
    expect(document.querySelector('label[for="hero-email"]')).toHaveClass("visually-hidden");
  });

  it("helps the browser fill it, and a phone show the right keyboard", () => {
    mount();
    expect(field()).toHaveAttribute("autocomplete", "email");
    expect(field()).toHaveAttribute("inputmode", "email");
    expect(field()).toHaveAttribute("maxlength", String(MAX_LENGTH.email));
  });

  it("sends with one button, worded from Sanity, in the same form", () => {
    mount();
    const button = screen.getByRole("button", { name: CTA });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).toBe(field().closest("form"));
  });

  it("leaves the checking to the server, so it works without JavaScript", () => {
    mount();
    expect(document.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("masks what is typed from session recording", () => {
    mount();
    expect(document.querySelector("form")).toHaveAttribute("data-clarity-mask", "true");
  });

  it("carries the honeypot, hidden from sight, AT and the tab order", () => {
    mount();
    const trap = document.querySelector<HTMLInputElement>(`input[name="${HONEYPOT_FIELD}"]`)!;
    expect(trap).toHaveAttribute("id", "hero-company");
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.closest("[aria-hidden='true']")).toHaveClass("visually-hidden");
  });

  it("uses ids of its own, beside the enquiry form further down the page", () => {
    mount();
    expect(document.getElementById("email")).toBeNull();
    expect(document.getElementById("company")).toBeNull();
  });

  it("says nothing until something is sent", () => {
    mount();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).not.toHaveAttribute("aria-describedby");
  });

  it("states no privacy line beside the field (removed 2026-11-14)", () => {
    const { container } = mount();
    expect(container).not.toHaveTextContent(/privacy/i);
  });
});

describe("HeroLead, once sent", () => {
  it("hands the server what was typed", async () => {
    submitHeroLead.mockResolvedValue({ status: "ok", name: "", phone: "" });
    mount();
    await send("james@example.com");
    const data = submitHeroLead.mock.calls[0][1] as FormData;
    expect(data.get("email")).toBe("james@example.com");
    expect(data.get(HONEYPOT_FIELD)).toBe("");
  });

  it("replaces the field with thanks, and the way to say more", async () => {
    submitHeroLead.mockResolvedValue({ status: "ok", name: "", phone: "" });
    mount();
    await send("james@example.com");
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "Thank you. We will reply by email to arrange your site visit. Tell us more about your home.",
    );
    expect(screen.getByRole("link", { name: "Tell us more about your home" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("promises no response time", async () => {
    submitHeroLead.mockResolvedValue({ status: "ok", name: "", phone: "" });
    mount();
    await send("james@example.com");
    expect((await screen.findByRole("status")).textContent).not.toMatch(
      /within|minutes|\bhour|today/i,
    );
  });

  it("says what to fix, ties it to the field, and puts the visitor back in it", async () => {
    submitHeroLead.mockResolvedValue({
      status: "invalid",
      fieldErrors: { email: "Check the email address." },
      values: { email: "james" },
    });
    mount();
    await send("james");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Check the email address.");
    expect(alert).toHaveAttribute("id", "hero-email-problem");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAttribute("aria-describedby", "hero-email-problem");
    expect(field()).toHaveFocus();
  });

  it("keeps what was typed after an error", async () => {
    submitHeroLead.mockResolvedValue({
      status: "invalid",
      fieldErrors: { email: "Check the email address." },
      values: { email: "james" },
    });
    mount();
    await send("james");
    await screen.findByRole("alert");
    expect(field()).toHaveValue("james");
  });

  it("says a failed send failed, without blaming what was typed", async () => {
    submitHeroLead.mockResolvedValue({ status: "failed", values: { email: "james@example.com" } });
    mount();
    await send("james@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That did not send. Please try again in a moment.",
    );
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).toHaveAttribute("aria-describedby", "hero-email-problem");
    expect(field()).toHaveValue("james@example.com");
  });

  it("asks for a pause after too many tries", async () => {
    submitHeroLead.mockResolvedValue({
      status: "failed",
      reason: "rate-limited",
      values: { email: "james@example.com" },
    });
    mount();
    await send("james@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That is a lot of tries in a short time. Please wait a few minutes and try again.",
    );
  });

  it("does not send twice while the first is on its way", async () => {
    let finish: (value: unknown) => void = () => {};
    submitHeroLead.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mount();
    fireEvent.change(field(), { target: { value: "james@example.com" } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    await act(async () => finish({ status: "ok", name: "", phone: "" }));
    expect(submitHeroLead).toHaveBeenCalledTimes(1);
  });
});
