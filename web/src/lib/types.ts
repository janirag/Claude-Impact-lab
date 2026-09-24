import { z } from "zod";

export type Level = "guide" | "useful" | "off";
export type Language = "ca" | "es" | "en";

export type Fact = { id: string; text: string; category: string; learned_from: string; date: string };

export type Skill = { id: string; title: string; instructions: string };

export type Profile = {
  name?: string;
  language?: Language;
  answer_style?: "short" | "detailed" | "visual";
  context?: "personal" | "work" | "study";
  facts: Fact[];
};

export type HistoryItem = { role: "user" | "assistant"; text: string };

export type TipRecord = {
  at: string;
  turn: number;
  action: CoachActionName;
  ref?: string;
  outcome: "shown" | "accepted" | "later" | "never";
};

export type User = {
  id: string;
  created_at: string;
  level: Level;
  mode?: "learn" | "do";
  turn: number;
  profile: Profile;
  skills: Skill[];
  labs_done: string[];
  cards: { id: string; earned_at: string; evidence: string }[];
  missions: { id: string; status: "open" | "done"; assigned_at: string }[];
  tip_history: TipRecord[];
  never: string[]; // "action" or "action:ref" keys the user asked never to see again
  dismissals_in_a_row: number;
  pending: Record<string, CoachEvent>; // shown events awaiting the user's tap
  history: HistoryItem[];
};

// ---------- Coach contract ----------

export const MOODS = ["curious", "happy", "thoughtful", "celebrate"] as const;
export const ANCHORS = ["upload_button", "composer", "answer_notes", "card_shelf", "lab_button"] as const;

export const CoachActionSchema = z.object({
  action: z.enum([
    "stay_silent",
    "show_tip",
    "award_card",
    "propose_memory",
    "suggest_lab",
    "assign_mission",
    "check_in_mission",
    "suggest_step_down",
  ]),
  text: z.string().optional(),
  ref: z.string().optional(),
  fact: z.string().optional(),
  fact_category: z.string().optional(),
  evidence: z.string().optional(),
  mood: z.enum(MOODS),
  point_at: z.enum(ANCHORS).optional(),
  safety: z.boolean().optional(),
});
export type CoachAction = z.infer<typeof CoachActionSchema>;
export type CoachActionName = CoachAction["action"];

// What the orchestrator actually sends to the UI.
export type CoachEvent = CoachAction & {
  id: string;
  deliver: "now" | "at_pause"; // at_pause: the mascot waits until the user stops typing/scrolling
  quiet?: boolean; // update the UI (e.g. card shelf) without a speech bubble
  buttons?: { id: "accept" | "later" | "never"; label: string }[];
};

// Signals the frontend sends so the orchestrator only speaks at a pause.
export type UiSignals = { typing?: boolean; scrolling?: boolean };
