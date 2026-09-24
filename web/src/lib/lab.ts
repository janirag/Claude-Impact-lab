import { cardById, inLanguage, labById } from "./catalog";
import { t, uiLanguage } from "./i18n";
import { awardCard } from "./policy";
import type { CoachEvent, Language, User } from "./types";
import { randomUUID } from "node:crypto";

export type LabAnswers = Record<string, string | string[]>;

const LANG: Record<string, Language> = { "Català": "ca", "Español": "es", "English": "en" };
const STYLE = { "Short": "short", "Detailed": "detailed", "Visual, with lists": "visual" } as const;
const CONTEXT = { "Personal life": "personal", "Work": "work", "Studies": "study" } as const;

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

  if (missionId === "you") {
    user.profile.context = CONTEXT[one("context") as keyof typeof CONTEXT];
    user.profile.language = LANG[one("language")];
    user.profile.answer_style = STYLE[one("style") as keyof typeof STYLE];
    saved.push(`remember you use it mostly for ${one("context").toLowerCase()}`, `answer in ${one("language")}`, `keep answers ${one("style").toLowerCase()}`);
  }

  if (!user.labs_done.includes(missionId)) user.labs_done.push(missionId);

  const events: CoachEvent[] = [];
  const card = labById(missionId)?.card;
  if (card && awardCard(user, card, `Completed Lab: ${missionId}`)) {
    // After the "you" mission this is already in the language the user just picked.
    const lang = uiLanguage(user);
    events.push({ id: randomUUID().slice(0, 12), action: "award_card", ref: card, mood: "celebrate", deliver: "now", text: t(lang, "mission_card", { card: inLanguage(cardById(card)!, lang).title }) });
  }
  return { saved, events };
}
