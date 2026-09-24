import { CARDS, CHALLENGES, LAB_MISSIONS, inLanguage, labInLanguage } from "./catalog";
import { uiLanguage } from "./i18n";
import type { User } from "./types";

// What the frontend sees of a user: "What Clawd remembers", cards, challenges and Labs, in the user's language.
export const view = (u: User) => {
  const lang = uiLanguage(u);
  const card = (id: string) => { const c = CARDS.find((x) => x.id === id); return c && inLanguage(c, lang); };
  const challenge = (id: string) => { const c = CHALLENGES.find((x) => x.id === id); return c && inLanguage(c, lang); };
  return {
    level: u.level,
    mode: u.mode ?? null,
    ui_language: u.ui_language ?? null,
    language: lang, // what the screen should be shown in: the saved profile language, else ui_language
    profile: u.profile,
    skills: u.skills,
    cards: u.cards.map((c) => ({ ...c, ...card(c.id) })),
    missions: u.missions.map((m) => ({ ...m, ...challenge(m.id) })),
    // Every real-life challenge with this user's status, for the panel list.
    challenges: CHALLENGES.map((c) => ({ ...inLanguage(c, lang), status: u.missions.find((m) => m.id === c.id)?.status ?? null })),
    cards_total: CARDS.length,
    labs: LAB_MISSIONS.map((m) => {
      const { steps, ...rest } = labInLanguage(m, lang);
      return { ...rest, done: u.labs_done.includes(m.id) };
    }),
  };
};
