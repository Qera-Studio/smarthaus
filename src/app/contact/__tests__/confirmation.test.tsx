// The confirmation a visitor sees after a successful send. The terms say no
// response time is guaranteed, so the copy must not promise one.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContactForm } from "../ContactForm";

const submitEnquiry = jest.fn();
const submitShortEnquiry = jest.fn();

jest.mock("../actions", () => ({
  submitEnquiry: (...args: unknown[]) => submitEnquiry(...args),
  submitShortEnquiry: (...args: unknown[]) => submitShortEnquiry(...args),
}));

async function submit() {
  const form = document.querySelector("form")!;
  await act(async () => {
    fireEvent.submit(form);
  });
}

describe("the confirmation", () => {
  beforeEach(() => {
    submitEnquiry.mockReset();
    submitShortEnquiry.mockReset();
  });

  it("says we will usually call, on the number given, within the hour", async () => {
    submitEnquiry.mockResolvedValue({ status: "ok", name: "Nadia", phone: "+971501234567" });
    render(<ContactForm />);
    await submit();
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "Thanks, Nadia. We’ll usually call you on +971501234567 within the hour during business hours.",
    );
  });

  it("never promises a call without 'usually'", async () => {
    submitEnquiry.mockResolvedValue({ status: "ok", name: "Nadia", phone: "+971501234567" });
    render(<ContactForm />);
    await submit();
    const status = await screen.findByRole("status");
    expect(status.textContent).not.toMatch(/We’ll call you/);
  });

  it("reads naturally without a name or number, as after a caught bot", async () => {
    // The honeypot answers with an empty name and phone.
    submitEnquiry.mockResolvedValue({ status: "ok", name: "", phone: "" });
    render(<ContactForm />);
    await submit();
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "Thanks. We’ll usually call you within the hour during business hours.",
    );
  });

  it("confirms the short homepage form the same way", async () => {
    submitShortEnquiry.mockResolvedValue({ status: "ok", name: "James", phone: "+971501234567" });
    render(<ContactForm variant="short" />);
    await submit();
    expect(submitShortEnquiry).toHaveBeenCalledTimes(1);
    expect(submitEnquiry).not.toHaveBeenCalled();
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("We’ll usually call you on +971501234567");
  });
});

describe("a refused or failed send", () => {
  beforeEach(() => {
    submitEnquiry.mockReset();
  });

  it("says a rate-limited send was not sent, asks for a few minutes, and offers WhatsApp", async () => {
    submitEnquiry.mockResolvedValue({ status: "failed", reason: "rate-limited", values: {} });
    render(<ContactForm />);
    await submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Several enquiries have come from here in the last few minutes, so this one was not sent. Try again in a few minutes. Message us on WhatsApp and we’ll pick it up straight away.",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the plain failure copy when the send itself failed", async () => {
    submitEnquiry.mockResolvedValue({ status: "failed", values: {} });
    render(<ContactForm />);
    await submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "That didn’t send. Message us on WhatsApp and we’ll pick it up straight away.",
    );
    expect(alert).not.toHaveTextContent("few minutes");
  });

  it("refills what was typed after a refusal, so nothing has to be retyped", async () => {
    submitEnquiry.mockResolvedValue({
      status: "failed",
      reason: "rate-limited",
      values: { name: "Nadia", phone: "0501234567", message: "Two villas" },
    });
    render(<ContactForm />);
    await submit();
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Name")).toHaveValue("Nadia");
    expect(screen.getByLabelText("Phone")).toHaveValue("0501234567");
  });
});
