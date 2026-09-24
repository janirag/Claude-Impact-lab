import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// Resolves credentials from the environment (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant` profile).
export function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// Server-side fallback: if the model declines, the API re-runs the request on Anthropic's
// recommended fallback model for that refusal category, inside the same call.
export const fallback = () => ({ betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const });
