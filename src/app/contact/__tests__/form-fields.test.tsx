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
    expect(field).toHaveAccessibleDescription("Keep the message to 2,000 characters or fewer.");
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
