import type { Attachment } from "./task";
import type { CoachAction, User } from "../types";
import type { CoachMode } from "../prompts";

// Offline mode: canned answers and a rule-based coach so the demo works without network or key.

// Whole words only: "Un saludo" must not read as "salud".
const SENSITIVE = /\b(m[eéè]dic[oa]?s?|metges?|doctor(a|es|s)?|salud|salut|health|dolor|pain|pills?|pastillas?|hisenda|hacienda|tax(es)?|impost(os)?|impuestos?|lloguer|alquiler|rent|contract(e|es|s)?|contratos?|bancos?|banc|bank|multas?|fines?)\b/i;
const PERSONAL_DATA = /\b(\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|ES\d{2}[\s\d]{20,})\b/i;
const TRANSLATE = /\b(tradu|translat)\w*/i;

export function offlineAnswer(text: string, attachment?: Attachment): string {
  if (attachment) {
    return `(Offline example) I can see your ${attachment.media_type === "application/pdf" ? "document" : "photo"}. In a live session I'd read it and explain, in plain words, what it says and what you need to do, keeping every date and amount exactly as written.\n---\nNotes for you\n• Check the deadline on the original before acting.`;
  }
  if (TRANSLATE.test(text)) {
    return "(Offline example) Here is the translation. In a live session I'd match the tone you want, formal (vostè) or friendly (tu).";
  }
  return "(Offline example) Here's a short answer to your request. In a live session Claude would answer this for real.";
}

export function offlineCoach(user: User, mode: CoachMode, latest?: { user: string }): CoachAction[] {
  const has = (card: string) => user.cards.some((c) => c.id === card);
  if (mode === "return") {
    const open = user.missions.find((m) => m.status === "open");
    return open
      ? [{ action: "check_in_mission", ref: open.id, text: "Welcome back! How did the challenge go?", mood: "happy" }]
      : [{ action: "show_tip", text: "Hi again! What do you need help with today?", mood: "happy" }];
  }
  if (mode === "chat") return [{ action: "show_tip", text: "I'm Clawd! Ask me anything about these tools.", mood: "curious" }];

  const msg = latest?.user ?? "";
  if (PERSONAL_DATA.test(msg)) {
    return [{ action: "show_tip", text: "Psst, no need to share ID or bank numbers here.", mood: "thoughtful", safety: true, point_at: "composer" }];
  }
  if (SENSITIVE.test(msg)) {
    const out: CoachAction[] = [{ action: "show_tip", text: "This one matters. Want to see how to check it?", mood: "thoughtful", safety: true, point_at: "answer_notes" }];
    if (!has("check_before_trusting")) out.push({ action: "award_card", ref: "check_before_trusting", evidence: "Asked about something important", mood: "celebrate" });
    return out;
  }
  const translations = user.history.filter((h) => h.role === "user" && TRANSLATE.test(h.text)).length;
  if (translations >= 3 && !user.never.includes("suggest_lab:clients")) {
    return [{ action: "suggest_lab", ref: "clients", text: `You've translated ${translations} times. Teach me how you like them?`, mood: "curious", point_at: "lab_button" }];
  }
  if (msg.length > 700 && !has("show_a_photo")) {
    return [{ action: "show_tip", text: "Long letter? Next time just send me a photo of it.", mood: "curious", point_at: "upload_button" }];
  }
  if (msg.trim().split(/\s+/).length <= 6) {
    return [{ action: "show_tip", text: "Tip: tell me who it's for and I'll get the tone right.", mood: "curious", point_at: "composer" }];
  }
  return [{ action: "stay_silent", mood: "happy" }];
}
