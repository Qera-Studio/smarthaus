import { z } from "zod";

/**
 * The environment a production deployment needs, checked once at start-up by
 * src/instrumentation.ts. Each entry names the variable and what is wrong with
 * it, never its value: a key in a log is a leaked key.
 */
const CHECKS: Record<string, { schema: z.ZodType; problem: string }> = {
  RESEND_API_KEY: {
    schema: z.string().regex(/^re_[A-Za-z0-9_]{8,}$/),
    problem: "must be a Resend API key (re_…)",
  },
  LEAD_EMAIL: { schema: z.email(), problem: "must be the mailbox leads are sent to" },
  LEAD_FROM_EMAIL: {
    schema: z.email(),
    problem: "must be an address on the domain verified in Resend",
  },
  NEXT_PUBLIC_WHATSAPP_NUMBER: {
    schema: z.string().regex(/^[1-9]\d{8,14}$/),
    problem: "must be the WhatsApp number as digits only, country code first, no +",
  },
};

export type ConfigProblem = { variable: string; problem: string };

export function checkConfig(env: Record<string, string | undefined>): ConfigProblem[] {
  return Object.entries(CHECKS).flatMap(([variable, { schema, problem }]) => {
    const value = env[variable]?.trim();
    if (!value) return [{ variable, problem: "is not set" }];
    return schema.safeParse(value).success ? [] : [{ variable, problem }];
  });
}

/** The variables checked, for documentation and tests. */
export const REQUIRED_VARIABLES = Object.keys(CHECKS);
