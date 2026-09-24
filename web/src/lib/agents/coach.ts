import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CARDS, CHALLENGES, LAB_MISSIONS } from "../catalog";
import { config } from "../config";
import { COACH_SYSTEM, coachContext, type CoachMode } from "../prompts";
import { ANCHORS, MOODS, type CoachAction, type User } from "../types";
import { anthropic, fallback } from "./client";

const mood = z.enum(MOODS);
const pointAt = z.enum(ANCHORS).optional().describe("Part of the screen Clawd walks to");
const text = z.string().max(200).describe("What Clawd says. Max 15 words, user's language.");
const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id) as [string, ...string[]];

// Each tool only *proposes* an action. The orchestrator decides what reaches the screen.
function coachTools(proposals: CoachAction[]) {
  const propose = (a: CoachAction) => {
    proposals.push(a);
    return "Noted. The orchestrator decides whether and when Clawd shows this.";
  };
  return [
    betaZodTool({
      name: "stay_silent",
      description: "Clawd does nothing this turn. The default.",
      inputSchema: z.object({ reason: z.string().optional() }),
      run: async () => propose({ action: "stay_silent", mood: "happy" }),
    }),
    betaZodTool({
      name: "show_tip",
      description: "Clawd shows a short speech bubble with a tip, question or reply.",
      inputSchema: z.object({ text, mood, point_at: pointAt, safety: z.boolean().optional().describe("True for health/legal/money checks or personal data warnings") }),
      run: async (i) => propose({ action: "show_tip", ...i }),
    }),
    betaZodTool({
      name: "award_card",
      description: "Unlock a card the user just earned by doing what it teaches.",
      inputSchema: z.object({ card_id: z.enum(ids(CARDS)), evidence: z.string().max(160), text: text.optional(), mood }),
      run: async ({ card_id, ...i }) => propose({ action: "award_card", ref: card_id, ...i }),
    }),
    betaZodTool({
      name: "propose_memory",
      description: "Ask whether to remember a preference or detail the user mentioned. Saved only if they say yes.",
      inputSchema: z.object({ fact: z.string().max(200).describe("General fact, never ID numbers, diagnoses or amounts"), fact_category: z.string().max(30), text, mood }),
      run: async (i) => propose({ action: "propose_memory", ...i }),
    }),
    betaZodTool({
      name: "suggest_lab",
      description: "Invite the user to a short Lab mission, e.g. after they repeat the same kind of task.",
      inputSchema: z.object({ mission_id: z.enum(ids(LAB_MISSIONS.filter((m) => m.ready))), text, mood, point_at: pointAt }),
      run: async ({ mission_id, ...i }) => propose({ action: "suggest_lab", ref: mission_id, ...i }),
    }),
    betaZodTool({
      name: "assign_mission",
      description: "Give a small real-life challenge to try outside the app, at a natural end of a task.",
      inputSchema: z.object({ challenge_id: z.enum(ids(CHALLENGES)), text, mood }),
      run: async ({ challenge_id, ...i }) => propose({ action: "assign_mission", ref: challenge_id, ...i }),
    }),
    betaZodTool({
      name: "check_in_mission",
      description: "Ask how an open real-life challenge went.",
      inputSchema: z.object({ challenge_id: z.enum(ids(CHALLENGES)), text, mood }),
      run: async ({ challenge_id, ...i }) => propose({ action: "check_in_mission", ref: challenge_id, ...i }),
    }),
  ];
}

export async function runCoach(
  user: User,
  mode: CoachMode,
  latest?: { user: string; assistant?: string },
  signal?: AbortSignal,
): Promise<CoachAction[]> {
  const proposals: CoachAction[] = [];
  const message = await anthropic().beta.messages.toolRunner(
    {
      ...fallback(),
      model: config.coachModel,
      max_tokens: 4000,
      max_iterations: 3,
      output_config: { effort: "low" },
      system: [{ type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: coachTools(proposals),
      messages: [{ role: "user", content: `${coachContext(user, mode, latest)}\n\nDecide Clawd's move now by calling a tool.` }],
    },
    { signal },
  );
  if (message.stop_reason === "refusal") return [];
  return proposals;
}
