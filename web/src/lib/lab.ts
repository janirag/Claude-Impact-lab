import { cardById, labById } from "./catalog";
import { awardCard } from "./policy";
import type { CoachEvent, Language, Topic, User } from "./types";
import { randomUUID } from "node:crypto";

export type LabAnswers = Record<string, string | string[]>;

const LANG: Record<string, Language> = { "Català": "ca", "Español": "es", "English": "en" };
const STYLE = { "Short and simple": "short", "Step by step": "steps", "With all the details": "detailed" } as const;
const TOPIC: Record<string, Topic> = {
  "Letters and paperwork": "paperwork", "Health questions": "health", "Money, bills and taxes": "money",
  "Home and rent": "home", "Writing messages and emails": "writing",
};

export function validateAnswers(missionId: string, answers: LabAnswers): string | null {
  const m = labById(missionId);
  if (!m || !m.ready) return "unknown or unavailable mission";
  for (const step of m.steps) {
    const a = answers[step.key];
    const list = Array.isArray(a) ? a : a ? [a] : [];
    if (!list.length) return `missing answer: ${step.key}`;
    if (!step.multi && list.length > 1) return `one answer only: ${step.key}`;
    if (list.some((x) => !step.options.includes(x))) return `invalid option for ${step.key}`;
  }
  return null;
}

// Applies a finished Lab mission. Returns the "From now on, Claude will…" lines and a celebration event.
export function completeLab(user: User, missionId: string, answers: LabAnswers): { saved: string[]; events: CoachEvent[] } {
  const saved: string[] = [];
  const one = (k: string) => (Array.isArray(answers[k]) ? (answers[k] as string[])[0] : (answers[k] as string));
  const many = (k: string) => (Array.isArray(answers[k]) ? (answers[k] as string[]) : [answers[k] as string]);

  if (missionId === "clients") {
    const rules = many("rules");
    const instructions = [
      `When the user writes to clients they are: ${one("role")}.`,
      `Tone for client emails: ${one("tone")}.`,
      ...rules.map((r) => `Rule: ${r}.`),
      rules.includes("Flag anything a client could misread")
        ? `After the email, add a line with only "---" and a short "Notes for you" section (max 3 bullets) flagging anything a client could misread. Write the notes in the language of the user's own request, not the email's.`
        : "",
    ].filter(Boolean).join("\n");
    const skill = { id: "clients", title: "Client emails", instructions };
    user.skills = [...user.skills.filter((s) => s.id !== "clients"), skill];
    saved.push(`know you write to clients as ${one("role").toLowerCase()}`, `use this tone: ${one("tone").toLowerCase()}`, ...rules.map((r) => r.charAt(0).toLowerCase() + r.slice(1)));
  }

  // The guide text itself is written by the frontend (in the user's UI language) and saved with PATCH /api/profile.
  if (missionId === "you") {
    user.profile.helps_with = many("helps").map((h) => TOPIC[h]);
    user.profile.answer_style = STYLE[one("style") as keyof typeof STYLE];
    user.profile.always = many("always");
    user.profile.language = LANG[one("language")];
    saved.push(`help you with ${many("helps").map((h) => h.toLowerCase()).join(", ")}`, `explain things ${one("style").toLowerCase()}`,
      ...many("always").map((r) => r.charAt(0).toLowerCase() + r.slice(1)), `answer in ${one("language")}`);
  }

  if (!user.labs_done.includes(missionId)) user.labs_done.push(missionId);

  const events: CoachEvent[] = [];
  const card = labById(missionId)?.card;
  if (card && awardCard(user, card, `Completed Lab: ${missionId}`)) {
    events.push({ id: randomUUID().slice(0, 12), action: "award_card", ref: card, mood: "celebrate", deliver: "now", text: `Mission complete! New card: ${cardById(card)!.title}` });
  }
  return { saved, events };
}
