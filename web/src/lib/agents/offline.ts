import { inLanguage, situationById } from "../catalog";
import { uiLanguage } from "../i18n";
import type { Attachment } from "./task";
import type { CoachAction, Language, User } from "../types";
import type { CoachMode } from "../prompts";

// Offline mode: canned answers and a rule-based coach so the demo works without network or key.
// Both speak the user's app language (saved profile language, else the browser's).

// Whole words only: "Un saludo" must not read as "salud".
const SENSITIVE = /\b(m[eéè]dic[oa]?s?|metges?|doctor(a|es|s)?|salud|salut|health|dolor|pain|pills?|pastillas?|hisenda|hacienda|tax(es)?|impost(os)?|impuestos?|lloguer|alquiler|rent|contract(e|es|s)?|contratos?|bancos?|banc|bank|multas?|fines?)\b/i;
const PERSONAL_DATA = /\b(\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|ES\d{2}[\s\d]{20,})\b/i;
const TRANSLATE = /\b(tradu|translat)\w*/i;

const ANSWERS: Record<Language, {
  wants_file: (title: string) => string;
  attachment: (pdf: boolean) => string;
  translate: string;
  other: string;
}> = {
  en: {
    wants_file: (title) => `(Offline example) Happy to help with "${title}". Send me a photo of it with the + button and I'll explain it in plain words.`,
    attachment: (pdf) => `(Offline example) I can see your ${pdf ? "document" : "photo"}. In a live session I'd read it and explain, in plain words, what it says and what you need to do, keeping every date and amount exactly as written.\n---\nNotes for you\n• Check the deadline on the original before acting.`,
    translate: "(Offline example) Here is the translation. In a live session I'd match the tone you want, formal (vostè) or friendly (tu).",
    other: "(Offline example) Here's a short answer to your request. In a live session Claude would answer this for real.",
  },
  es: {
    wants_file: (title) => `(Ejemplo sin conexión) Con mucho gusto te ayudo con "${title}". Envíame una foto con el botón + y te lo explico con palabras sencillas.`,
    attachment: (pdf) => `(Ejemplo sin conexión) Veo tu ${pdf ? "documento" : "foto"}. En una sesión real ${pdf ? "lo" : "la"} leería y te explicaría, con palabras sencillas, qué dice y qué tienes que hacer, con todas las fechas e importes tal como aparecen.\n---\nNotas para ti\n• Comprueba el plazo en el original antes de hacer nada.`,
    translate: "(Ejemplo sin conexión) Aquí tienes la traducción. En una sesión real usaría el tono que quieras, formal (vostè) o cercano (tu).",
    other: "(Ejemplo sin conexión) Aquí tienes una respuesta corta a tu petición. En una sesión real, Claude te respondería de verdad.",
  },
  ca: {
    wants_file: (title) => `(Exemple sense connexió) T'ajudo de gust amb "${title}". Envia-me'n una foto amb el botó + i t'ho explico amb paraules senzilles.`,
    attachment: (pdf) => `(Exemple sense connexió) Veig ${pdf ? "el teu document" : "la teva foto"}. En una sessió real ${pdf ? "el" : "la"} llegiria i t'explicaria, amb paraules senzilles, què diu i què has de fer, amb totes les dates i els imports tal com hi surten.\n---\nNotes per a tu\n• Comprova el termini a l'original abans de fer res.`,
    translate: "(Exemple sense connexió) Aquí tens la traducció. En una sessió real faria servir el to que vulguis, formal (vostè) o proper (tu).",
    other: "(Exemple sense connexió) Aquí tens una resposta curta a la teva petició. En una sessió real, Claude et respondria de debò.",
  },
};

export function offlineAnswer(text: string, attachment?: Attachment, situation?: string, lang: Language = "en"): string {
  const a = ANSWERS[lang];
  const s = situation ? situationById(situation) : undefined;
  if (s?.wants_file && !attachment) return a.wants_file(inLanguage(s, lang).title.toLowerCase());
  if (attachment) return a.attachment(attachment.media_type === "application/pdf");
  if (TRANSLATE.test(text)) return a.translate;
  return a.other;
}

const COACH: Record<Language, {
  welcome_check_in: string; welcome: string; hello: string; personal_data: string;
  important: string; translations: (n: number) => string; long_letter: string; context: string;
}> = {
  en: {
    welcome_check_in: "Welcome back! How did the challenge go?",
    welcome: "Hi again! What do you need help with today?",
    hello: "I'm Clawd! Ask me anything about these tools.",
    personal_data: "Psst, no need to share ID or bank numbers here.",
    important: "This one matters. Want to see how to check it?",
    translations: (n) => `You've translated ${n} times. Teach me how you like them?`,
    long_letter: "Long letter? Next time just send me a photo of it.",
    context: "Tip: tell me who it's for and I'll get the tone right.",
  },
  es: {
    welcome_check_in: "¡Hola de nuevo! ¿Qué tal fue el reto?",
    welcome: "¡Hola otra vez! ¿Con qué te ayudo hoy?",
    hello: "¡Soy Clawd! Pregúntame lo que quieras sobre estas herramientas.",
    personal_data: "Psst, no hace falta que compartas aquí tu DNI ni números de cuenta.",
    important: "Esto es importante. ¿Te enseño cómo comprobarlo?",
    translations: (n) => `Ya llevas ${n} traducciones. ¿Me enseñas cómo te gustan?`,
    long_letter: "¿Carta larga? La próxima vez, envíame una foto.",
    context: "Truco: dime para quién es y acertaré con el tono.",
  },
  ca: {
    welcome_check_in: "Hola de nou! Com ha anat el repte?",
    welcome: "Hola de nou! Amb què t'ajudo avui?",
    hello: "Sóc en Clawd! Pregunta'm el que vulguis sobre aquestes eines.",
    personal_data: "Psst, no cal que comparteixis aquí el DNI ni números de compte.",
    important: "Això és important. T'ensenyo com comprovar-ho?",
    translations: (n) => `Ja portes ${n} traduccions. M'ensenyes com t'agraden?`,
    long_letter: "Carta llarga? La propera vegada, envia-me'n una foto.",
    context: "Truc: digues-me per a qui és i encertaré el to.",
  },
};

export function offlineCoach(user: User, mode: CoachMode, latest?: { user: string }): CoachAction[] {
  const has = (card: string) => user.cards.some((c) => c.id === card);
  const say = COACH[uiLanguage(user)];
  if (mode === "return") {
    const open = user.missions.find((m) => m.status === "open");
    return open
      ? [{ action: "check_in_mission", ref: open.id, text: say.welcome_check_in, mood: "happy" }]
      : [{ action: "show_tip", text: say.welcome, mood: "happy" }];
  }
  if (mode === "chat") return [{ action: "show_tip", text: say.hello, mood: "curious" }];

  const msg = latest?.user ?? "";
  if (PERSONAL_DATA.test(msg)) {
    return [{ action: "show_tip", text: say.personal_data, mood: "thoughtful", safety: true, point_at: "composer" }];
  }
  if (SENSITIVE.test(msg)) {
    const out: CoachAction[] = [{ action: "show_tip", text: say.important, mood: "thoughtful", safety: true, point_at: "answer_notes" }];
    if (!has("check_before_trusting")) out.push({ action: "award_card", ref: "check_before_trusting", evidence: "Asked about something important", mood: "celebrate" });
    return out;
  }
  const translations = user.history.filter((h) => h.role === "user" && TRANSLATE.test(h.text)).length;
  if (translations >= 3 && !user.never.includes("suggest_lab:clients")) {
    return [{ action: "suggest_lab", ref: "clients", text: say.translations(translations), mood: "curious", point_at: "lab_button" }];
  }
  if (msg.length > 700 && !has("show_a_photo")) {
    return [{ action: "show_tip", text: say.long_letter, mood: "curious", point_at: "upload_button" }];
  }
  if (msg.trim().split(/\s+/).length <= 6) {
    return [{ action: "show_tip", text: say.context, mood: "curious", point_at: "composer" }];
  }
  return [{ action: "stay_silent", mood: "happy" }];
}
