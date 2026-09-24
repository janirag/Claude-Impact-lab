import type { Language, User } from "./types";

// Languages the app is shown in. The agents can answer in any language; this is only for the app's own words.

export const LANGUAGES: readonly Language[] = ["en", "es", "ca"];
export const LANG_NAME: Record<Language, string> = { ca: "Catalan", es: "Spanish", en: "English" };

export const isLanguage = (x: unknown): x is Language => (LANGUAGES as readonly unknown[]).includes(x);

// Picks the app language from the browser's list, most preferred first (navigator.languages or Accept-Language).
// Rule: Catalan wins if it appears anywhere before English. In Barcelona many devices keep Spanish first with
// Catalan added below it, and whoever added Catalan would rather read it. Otherwise the first of Spanish or
// English wins, and anything else falls back to English. prototype/index.html has the same function.
export function guessLanguage(prefs: readonly (string | null | undefined)[]): Language {
  const codes = prefs.map((p) => String(p ?? "").trim().toLowerCase().split(/[-_]/)[0]);
  const ca = codes.indexOf("ca"), en = codes.indexOf("en");
  if (ca >= 0 && (en < 0 || ca < en)) return "ca";
  return (codes.find((c) => c === "es" || c === "en") as Language | undefined) ?? "en";
}

// "ca-ES,ca;q=0.9,es;q=0.8" -> ["ca-ES", "ca", "es"], highest q first.
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  return (header ?? "").split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.trim().slice(2) ?? 1);
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, i };
    })
    .filter((x) => x.tag && x.tag !== "*" && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
    .map((x) => x.tag);
}

// The language for this user's screen and for anything said without other clues: saved preference, then browser.
export const uiLanguage = (user: User): Language => user.profile.language ?? user.ui_language ?? "en";

// The backend's own words that reach the screen: bubble buttons and fixed bubble texts.
const TEXT = {
  en: {
    got_it: "Got it", no_tips_like_this: "Don't show tips like this", nice: "Nice!",
    yes_remember: "Yes, remember", not_now: "Not now", dont_ask: "Don't ask",
    open_lab: "Open the Lab", dont_suggest: "Don't suggest this again",
    ill_try: "I'll try it", i_did_it: "I did it!", not_yet: "Not yet",
    only_useful: "Only when useful", keep_guiding: "Keep guiding me",
    new_card: "New card: {card}!",
    challenge_card: "You did it! New card: {card}",
    mission_card: "Mission complete! New card: {card}",
    step_down: "Looks like you'd rather get on with your work. Want me to show up only when it's useful?",
    not_sure: "Hmm, I'm not sure. Want to try it in the chat?",
  },
  es: {
    got_it: "Entendido", no_tips_like_this: "No me muestres consejos así", nice: "¡Genial!",
    yes_remember: "Sí, recuérdalo", not_now: "Ahora no", dont_ask: "No me preguntes",
    open_lab: "Abrir el Lab", dont_suggest: "No me lo vuelvas a sugerir",
    ill_try: "Lo probaré", i_did_it: "¡Lo hice!", not_yet: "Aún no",
    only_useful: "Solo si es útil", keep_guiding: "Sigue guiándome",
    new_card: "¡Carta nueva: {card}!",
    challenge_card: "¡Lo conseguiste! Carta nueva: {card}",
    mission_card: "¡Misión cumplida! Carta nueva: {card}",
    step_down: "Parece que prefieres seguir con lo tuyo. ¿Quieres que aparezca solo cuando sea útil?",
    not_sure: "Mmm, no lo tengo claro. ¿Lo pruebas en el chat?",
  },
  ca: {
    got_it: "Entesos", no_tips_like_this: "No em mostris consells així", nice: "Genial!",
    yes_remember: "Sí, recorda-ho", not_now: "Ara no", dont_ask: "No m'ho preguntis",
    open_lab: "Obre el Lab", dont_suggest: "No m'ho tornis a suggerir",
    ill_try: "Ho provaré", i_did_it: "Ho he fet!", not_yet: "Encara no",
    only_useful: "Només si és útil", keep_guiding: "Continua guiant-me",
    new_card: "Carta nova: {card}!",
    challenge_card: "Ho has aconseguit! Carta nova: {card}",
    mission_card: "Missió acomplerta! Carta nova: {card}",
    step_down: "Sembla que prefereixes continuar amb la teva feina. Vols que només aparegui quan sigui útil?",
    not_sure: "Mmm, no ho tinc clar. Ho proves al xat?",
  },
} satisfies Record<Language, Record<string, string>>;

export type TextKey = keyof typeof TEXT.en;

export function t(lang: Language, key: TextKey, vars: Record<string, string> = {}): string {
  return (TEXT[lang]?.[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
