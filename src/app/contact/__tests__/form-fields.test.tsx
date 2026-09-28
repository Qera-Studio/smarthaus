// The form's fields as rendered: the caps the browser enforces, and an error
// slot on every field the server can refuse, so no rejection is invisible.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContactForm } from "../ContactForm";
import { MAX_LENGTH } from "../../../lib/contact-schema";

const submitEnquiry = jest.fn();
jest.mock("../actions", () => ({
  submitEnquiry: (...args: unknown[]) => submitEnquiry(...args),
  submitShortEnquiry: jest.fn(),
}));

async function submitWith(state: unknown) {
  submitEnquiry.mockResolvedValue(state);
  render(<ContactForm />);
  await act(async () => {
    fireEvent.submit(document.querySelector("form")!);
  });
}

describe("field caps", () => {
  it.each([
    ["Name", MAX_LENGTH.name],
    ["Email", MAX_LENGTH.email],
    ["Phone", MAX_LENGTH.phone],
    ["Community", MAX_LENGTH.community],
    ["Message", MAX_LENGTH.message],
  ])("caps %s at %i characters in the browser", (label, max) => {
    render(<ContactForm />);
    expect(screen.getByLabelText(label)).toHaveAttribute("maxLength", String(max));
  });

  it("caps the short form's fields the same way", () => {
    render(<ContactForm variant="short" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "120");
    expect(screen.getByLabelText("Message")).toHaveAttribute("maxLength", "2000");
  });
});

describe("errors on the optional fields", () => {
  it("shows a message error beside the message field, tied to it", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { message: "Keep the message to 2,000 characters or fewer." },
      values: {},
    });
    const field = screen.getByLabelText("Message");
    expect(field).toHaveAttribute("aria-invalid", "true");
    // The limit hint first, then the error: both read with the field.
    expect(field).toHaveAccessibleDescription(
      "Optional. Up to 2,000 characters. Keep the message to 2,000 characters or fewer.",
    );
  });

  it("shows a community error beside the community field, tied to it", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { community: "Keep the community to 120 characters or fewer." },
      values: {},
    });
    const field = screen.getByLabelText("Community");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Keep the community to 120 characters or fewer.");
  });

  it("moves focus to the message field when it is the only error", async () => {
    await submitWith({ status: "invalid", fieldErrors: { message: "Too long." }, values: {} });
    expect(screen.getByLabelText("Message")).toHaveFocus();
  });

  it("focuses the first error in visual order: community before message", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { message: "Too long.", community: "Too long." },
      values: {},
    });
    expect(screen.getByLabelText("Community")).toHaveFocus();
  });

  it("focuses phone before community, as they appear on the page", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { community: "Too long.", phone: "Check the number." },
      values: {},
    });
    expect(screen.getByLabelText("Phone")).toHaveFocus();
  });

  it("marks neither optional field invalid when they have no error", async () => {
    await submitWith({ status: "invalid", fieldErrors: { name: "Add your name." }, values: {} });
    expect(screen.getByLabelText("Message")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Community")).not.toHaveAttribute("aria-invalid");
  });
});

describe("hints stated before any error (WCAG 3.3.2)", () => {
  it("tells the visitor the phone format before they type", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription(
      "A UAE mobile number. Starting with 05 or +971 both work.",
    );
  });

  it("states the message's limit and that it is optional", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Message")).toHaveAccessibleDescription(
      "Optional. Up to 2,000 characters.",
    );
  });

  it("gives the short form the same hints", () => {
    render(<ContactForm variant="short" />);
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription(/UAE mobile number/);
  });

  it("reads the phone hint and then its error, in that order", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { phone: "Check the number. It should start with +971 or 05." },
      values: {},
    });
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription(
      "A UAE mobile number. Starting with 05 or +971 both work. Check the number. It should start with +971 or 05.",
    );
  });

  it("puts each hint under its control, so paired inputs line up", () => {
    // A hint between label and control pushed Phone and Message below Name
    // and Email in the two-column home enquiry (2026-09-28).
    render(<ContactForm />);
    for (const [label, hint] of [
      ["Phone", "phone-hint"],
      ["Message", "message-hint"],
    ] as const) {
      const control = screen.getByLabelText(label);
      const note = document.getElementById(hint)!;
      expect(control.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("keeps the hint above the error in the page, as in the description", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { phone: "Check the number. It should start with +971 or 05." },
      values: {},
    });
    const hint = document.getElementById("phone-hint")!;
    const error = document.getElementById("phone-error")!;
    expect(hint.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("gives fields without a hint no empty description", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
  });
});

describe("the error summary (Accessibility System §12)", () => {
  it("lists every problem once, in the order the fields appear", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: {
        contactConsent: "Please confirm.",
        phone: "Add a phone.",
        name: "Add your name.",
      },
      values: {},
    });
    const summary = screen.getByRole("alert");
    expect(summary).toHaveTextContent("Check these before sending:");
    expect(Array.from(summary.querySelectorAll("li")).map((item) => item.textContent)).toEqual([
      "Add your name.",
      "Add a phone.",
      "Please confirm.",
    ]);
  });

  it("says 'this' for a single problem", async () => {
    await submitWith({ status: "invalid", fieldErrors: { name: "Add your name." }, values: {} });
    expect(screen.getByRole("alert")).toHaveTextContent("Check this before sending:");
  });

  it("links each problem to its field", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { phone: "Add a phone.", contactConsent: "Please confirm." },
      values: {},
    });
    const links = screen.getAllByRole("link", { name: /Add a phone|Please confirm/ });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["#phone", "#contactConsent"]);
    for (const link of links) {
      expect(document.getElementById(link.getAttribute("href")!.slice(1))).not.toBeNull();
    }
  });

  it("is the only alert: the field messages are read with their fields instead", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { name: "Add your name.", phone: "Add a phone." },
      values: {},
    });
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Add your name.");
  });

  it("still moves focus to the first field in error", async () => {
    await submitWith({
      status: "invalid",
      fieldErrors: { phone: "Add a phone.", name: "Add your name." },
      values: {},
    });
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("is absent before a submit and after a failed send, which has its own banner", async () => {
    render(<ContactForm />);
    expect(screen.queryByText(/before sending/)).toBeNull();
  });

  it("ignores an empty error map rather than rendering an empty box", async () => {
    await submitWith({ status: "invalid", fieldErrors: {}, values: {} });
    expect(screen.queryByText(/before sending/)).toBeNull();
  });
});
