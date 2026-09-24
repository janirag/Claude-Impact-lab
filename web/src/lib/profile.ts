import { randomUUID } from "node:crypto";
import { policy } from "./config";
import type { Fact, Language, Topic, User } from "./types";

const LANG_NAME: Record<Language, string> = { ca: "Catalan", es: "Spanish", en: "English" };
const STYLE_NAME = { short: "short and simple", steps: "step by step", detailed: "detailed", visual: "visual, with lists" } as const;
const TOPIC_NAME: Record<Topic, string> = {
  paperwork: "letters and paperwork", health: "health questions", money: "money, bills and taxes",
  home: "home and rent", writing: "writing messages and emails", explore: "discovering what AI can do",
};

// Plain-text "About the user" block for the agents' system prompts. Empty profile -> empty string.
// Their guide (what they approved or edited in onboarding) replaces the structured lines it was built from.
export function aboutUser(user: User): string {
  const p = user.profile;
  const lines: string[] = [];
  if (p.name) lines.push(`Name: ${p.name}`);
  if (p.language) lines.push(`Preferred language: ${LANG_NAME[p.language]} (unless they write in another one)`);
  if (p.guide) lines.push(`Their guide for Claude, in their words (follow it):\n${p.guide}`);
  else {
    if (p.answer_style) lines.push(`Answer style: ${STYLE_NAME[p.answer_style]}`);
    if (p.context) lines.push(`Mostly uses this for: ${p.context}`);
    if (p.helps_with?.length) lines.push(`Wants help with: ${p.helps_with.map((t) => TOPIC_NAME[t]).join(", ")}`);
    for (const r of p.always ?? []) lines.push(`Always: ${r}`);
  }
  for (const f of p.facts) lines.push(`- ${f.text}`);
  if (!lines.length && !user.skills.length) return "";
  let out = `About the user (they chose to save this):\n${lines.join("\n")}`;
  for (const s of user.skills) out += `\n\nSaved skill "${s.title}":\n${s.instructions}`;
  return out;
}

export function addFact(user: User, text: string, category = "general", learnedFrom = "chat"): Fact | null {
  const clean = text.trim().slice(0, 200);
  if (!clean) return null;
  if (user.profile.facts.some((f) => f.text.toLowerCase() === clean.toLowerCase())) return null;
  const fact: Fact = { id: randomUUID().slice(0, 8), text: clean, category, learned_from: learnedFrom, date: new Date().toISOString().slice(0, 10) };
  user.profile.facts.push(fact);
  // Keep the list short: the oldest facts drop off first.
  if (user.profile.facts.length > policy.maxFacts) user.profile.facts.splice(0, user.profile.facts.length - policy.maxFacts);
  return fact;
}

// "My AI profile": paste into ChatGPT, Gemini or Claude custom instructions.
export function exportProfile(user: User): string {
  const about = aboutUser(user);
  if (!about) return "Nothing saved yet. Tell Clawd a bit about yourself, or try a Lab mission.";
  return `My AI profile (paste this into your assistant's custom instructions)\n\n${about.replace(/^About the user \(they chose to save this\):\n/, "")}\n`;
}
