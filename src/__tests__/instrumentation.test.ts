/**
 * @jest-environment node
 */
import { onRequestError, register } from "../instrumentation";

const env = process.env;

beforeEach(() => {
  process.env = { ...env };
  delete process.env.VERCEL_ENV;
  for (const name of [
    "RESEND_API_KEY",
    "LEAD_EMAIL",
    "LEAD_FROM_EMAIL",
    "NEXT_PUBLIC_WHATSAPP_NUMBER",
  ]) {
    delete process.env[name];
  }
});

afterAll(() => {
  process.env = env;
});

describe("register", () => {
  it("reports every missing variable at start-up in Vercel production", () => {
    process.env.VERCEL_ENV = "production";
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    register();
    expect(logged).toHaveBeenCalledTimes(1);
    const line = JSON.parse(logged.mock.calls[0]![0] as string);
    expect(line.event).toBe("config-invalid");
    expect(line.problems.map((p: { variable: string }) => p.variable)).toEqual([
      "RESEND_API_KEY",
      "LEAD_EMAIL",
      "LEAD_FROM_EMAIL",
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
    ]);
  });

  it("says nothing when production is fully configured", () => {
    Object.assign(process.env, {
      VERCEL_ENV: "production",
      RESEND_API_KEY: "re_AbC123_xyz7890",
      LEAD_EMAIL: "contact@mapletech.ae",
      LEAD_FROM_EMAIL: "leads@smarthaus.ae",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "971543755150",
    });
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    register();
    expect(logged).not.toHaveBeenCalled();
  });

  it.each([undefined, "preview", "development"])(
    "stays quiet outside production (VERCEL_ENV=%s), where the keys may be absent",
    (value) => {
      if (value) process.env.VERCEL_ENV = value;
      const logged = jest.spyOn(console, "error").mockImplementation(() => {});
      register();
      expect(logged).not.toHaveBeenCalled();
    },
  );

  it("never throws, so a misconfiguration cannot take down every route", () => {
    process.env.VERCEL_ENV = "production";
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => register()).not.toThrow();
  });

  it("never logs a value it found wanting", () => {
    process.env.VERCEL_ENV = "production";
    process.env.RESEND_API_KEY = "sk_live_TOPSECRET999";
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    register();
    expect(logged.mock.calls[0]![0]).not.toContain("TOPSECRET");
  });
});

describe("onRequestError", () => {
  const request = { path: "/contact?email=lead@example.com", method: "POST", headers: {} };
  const context = {
    routerKind: "App Router" as const,
    routePath: "/contact",
    routeType: "action" as const,
    renderSource: "server-rendering" as const,
    revalidateReason: undefined,
    renderType: "dynamic" as const,
  };

  it("logs one structured line with the route, name and digest", () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new TypeError("lead@example.com broke it"), { digest: "123abc" });
    onRequestError(error, request, context);
    expect(JSON.parse(logged.mock.calls[0]![0] as string)).toEqual({
      event: "request-error",
      name: "TypeError",
      digest: "123abc",
      method: "POST",
      path: "/contact",
      routePath: "/contact",
      routeType: "action",
    });
  });

  it("never logs the message or the query string, either of which can carry a lead's details", () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    onRequestError(new Error("lead@example.com broke it"), request, context);
    expect(logged.mock.calls[0]![0]).not.toContain("lead@example.com");
  });

  it("keeps a path that has no query string as it is", () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    onRequestError(new Error("x"), { ...request, path: "/pricing", method: "GET" }, context);
    const line = JSON.parse(logged.mock.calls[0]![0] as string);
    expect(line.path).toBe("/pricing");
    expect(line.method).toBe("GET");
  });

  it("copes with a thrown non-Error and no digest", () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    onRequestError("plain string", request, context);
    const line = JSON.parse(logged.mock.calls[0]![0] as string);
    expect(line.name).toBe("string");
    expect(line.digest).toBeUndefined();
  });

  it("reads a digest from a non-Error object too", () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    onRequestError({ digest: 42 }, request, context);
    expect(JSON.parse(logged.mock.calls[0]![0] as string).digest).toBe("42");
  });
});
