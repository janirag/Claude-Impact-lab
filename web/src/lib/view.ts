import { CARDS, CHALLENGES, LAB_MISSIONS } from "./catalog";
import type { User } from "./types";

// What the frontend sees of a user: "What Clawd remembers", cards, challenges and Labs.
export const view = (u: User) => ({
  level: u.level,
  mode: u.mode ?? null,
  profile: u.profile,
  skills: u.skills,
  cards: u.cards.map((c) => ({ ...c, ...CARDS.find((x) => x.id === c.id) })),
  missions: u.missions.map((m) => ({ ...m, ...CHALLENGES.find((x) => x.id === m.id) })),
  // Every real-life challenge with this user's status, for the panel list.
  challenges: CHALLENGES.map((c) => ({ ...c, status: u.missions.find((m) => m.id === c.id)?.status ?? null })),
  cards_total: CARDS.length,
  labs: LAB_MISSIONS.map(({ steps, ...m }) => ({ ...m, done: u.labs_done.includes(m.id) })),
});
