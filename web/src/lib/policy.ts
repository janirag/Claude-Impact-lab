import { randomUUID } from "node:crypto";
import { cardById, challengeById, labById } from "./catalog";
import { policy } from "./config";
import { addFact } from "./profile";
import type { CoachMode } from "./prompts";
import type { CoachAction, CoachActionName, CoachEvent, Level, User } from "./types";

// The orchestrator's rules. Pure functions over the user record, so they are easy to test.

const PRIORITY: CoachActionName[] = [
  "suggest_step_down", "check_in_mission", "suggest_lab", "propose_memory", "award_card", "assign_mission", "show_tip",
];

const BUTTONS: Partial<Record<CoachActionName, CoachEvent["buttons"]>> = {
  show_tip: [{ id: "accept", label: "Got it" }, { id: "never", label: "Don't show tips like this" }],
  award_card: [{ id: "accept", label: "Nice!" }],
  propose_memory: [{ id: "accept", label: "Yes, remember" }, { id: "later", label: "Not now" }, { id: "never", label: "Don't ask" }],
  suggest_lab: [{ id: "accept", label: "Open the Lab" }, { id: "later", label: "Not now" }, { id: "never", label: "Don't suggest this again" }],
  assign_mission: [{ id: "accept", label: "I'll try it" }, { id: "later", label: "Not now" }],
  check_in_mission: [{ id: "accept", label: "I did it!" }, { id: "later", label: "Not yet" }],
  suggest_step_down: [{ id: "accept", label: "Only when useful" }, { id: "later", label: "Keep guiding me" }],
};

const neverKey = (a: CoachAction) => (a.ref ? `${a.action}:${a.ref}` : a.action);

// "Just get it done" users get the quieter level unless they chose otherwise.
export const effectiveLevel = (user: User): Level => (user.level === "guide" && user.mode === "do" ? "useful" : user.level);

function isValid(user: User, a: CoachAction): boolean {
  switch (a.action) {
    case "stay_silent": return false;
    case "show_tip": return !!a.text?.trim();
    case "award_card": return !!a.ref && !!cardById(a.ref) && !user.cards.some((c) => c.id === a.ref);
    case "propose_memory":
      return !!a.fact?.trim() && !user.profile.facts.some((f) => f.text.toLowerCase() === a.fact!.trim().toLowerCase());
    case "suggest_lab": return !!a.ref && !!labById(a.ref)?.ready && !user.labs_done.includes(a.ref);
    case "assign_mission": return !!a.ref && !!challengeById(a.ref) && !user.missions.some((m) => m.id === a.ref && m.status === "open");
    case "check_in_mission": return !!a.ref && user.missions.some((m) => m.id === a.ref && m.status === "open");
    case "suggest_step_down": return true;
  }
}

function blockedByUser(user: User, a: CoachAction, mode: CoachMode): boolean {
  if (a.safety) return false; // safety tips always get through
  if (mode !== "after_turn" && a.action === "show_tip") return false; // replies when the user asked Clawd directly
  return user.never.includes(a.action) || user.never.includes(neverKey(a));
}

function allowedAtLevel(level: Level, a: CoachAction, mode: CoachMode): boolean {
  if (level === "off") return false;
  if (level === "guide" || mode !== "after_turn") return true;
  // "Only when useful": safety, time-savers and consent questions only.
  return !!a.safety || ["suggest_lab", "propose_memory", "check_in_mission", "award_card"].includes(a.action);
}

const typeKey = (action: string, ref?: string) => (ref ? `${action}:${ref}` : action);

// Unprompted bubbles only: a gap between any two, a longer gap per tip type after "Not now", and a cap per session.
function withinBudget(user: User, a: CoachAction, mode: CoachMode, level: Level): boolean {
  if (a.safety || mode !== "after_turn" || a.action === "award_card" || a.action === "suggest_step_down") return true;
  if (user.session.tips >= policy.tipsPerSession[level]) return false;
  const shown = user.tip_history.filter((t) => t.action !== "award_card" && t.action !== "suggest_step_down");
  const last = shown[shown.length - 1];
  if (last && user.turn - last.turn < policy.minTurnsBetweenTips[level]) return false;
  const gap = user.gaps[neverKey(a)];
  const lastOfType = [...shown].reverse().find((t) => typeKey(t.action, t.ref) === neverKey(a));
  return !gap || !lastOfType || user.turn - lastOfType.turn >= gap;
}

// User-started exchanges (tap on Clawd, return visit) answer right away; unprompted tips wait for a pause.
function toEvent(a: CoachAction, quiet = false, mode: CoachMode = "after_turn"): CoachEvent {
  return {
    ...a,
    id: randomUUID().slice(0, 12),
    deliver: a.safety || a.action === "award_card" || mode !== "after_turn" ? "now" : "at_pause",
    quiet: quiet || undefined,
    // A reply to the user's own question needs no buttons.
    buttons: quiet || (mode !== "after_turn" && a.action === "show_tip") ? undefined : BUTTONS[a.action],
  };
}

function record(user: User, e: CoachEvent) {
  user.tip_history.push({ at: new Date().toISOString(), turn: user.turn, action: e.action, ref: e.ref, outcome: "shown" });
  if (user.tip_history.length > 50) user.tip_history.splice(0, user.tip_history.length - 50);
  if (e.buttons?.length) user.pending[e.id] = e;
}

function awardCard(user: User, cardId: string, evidence: string) {
  if (user.cards.some((c) => c.id === cardId) || !cardById(cardId)) return false;
  user.cards.push({ id: cardId, earned_at: new Date().toISOString(), evidence: evidence.slice(0, 160) });
  return true;
}

// Coach proposes, orchestrator decides: at most one bubble, plus a quiet card award.
export function decide(user: User, proposals: CoachAction[], mode: CoachMode): CoachEvent[] {
  const level = effectiveLevel(user);
  if (level === "off") return [];

  let candidates = proposals.filter((a) => isValid(user, a) && !blockedByUser(user, a, mode) && allowedAtLevel(level, a, mode));

  // Two dismissals in a row while guiding: offer to step down (matches the prototype).
  if (mode === "after_turn" && user.level === "guide" && user.dismissals_in_a_row >= policy.dismissalsBeforeStepDown) {
    const safety = candidates.filter((a) => a.safety);
    candidates = [...safety, { action: "suggest_step_down", mood: "thoughtful", text: "Looks like you'd rather get on with your work. Want me to show up only when it's useful?" }];
  }

  const events: CoachEvent[] = [];
  const card = candidates.find((a) => a.action === "award_card");
  const visible = candidates
    .filter((a) => a.action !== "award_card" && withinBudget(user, a, mode, level))
    .sort((a, b) => Number(!!b.safety) - Number(!!a.safety) || PRIORITY.indexOf(a.action) - PRIORITY.indexOf(b.action))[0];

  if (card && awardCard(user, card.ref!, card.evidence ?? "")) {
    const quiet = !!visible || level === "useful";
    const e = toEvent({ ...card, mood: "celebrate", text: card.text ?? `New card: ${cardById(card.ref!)!.title}!` }, quiet, mode);
    record(user, e);
    events.push(e);
  }
  if (visible) {
    const e = toEvent(visible, false, mode);
    record(user, e);
    if (mode === "after_turn" && !e.safety && e.action !== "suggest_step_down") user.session.tips++;
    events.push(e);
  }
  return events;
}

export type AckResult = { ok: boolean; effect?: { open_lab?: string; level?: Level; saved_fact?: string; mission?: string }; events: CoachEvent[] };

// The user's tap on a bubble button.
export function acknowledge(user: User, eventId: string, response: "accept" | "later" | "never"): AckResult {
  const e = user.pending[eventId];
  if (!e) return { ok: false, events: [] };
  delete user.pending[eventId];

  const rec = [...user.tip_history].reverse().find((t) => t.action === e.action && t.ref === e.ref && t.outcome === "shown");
  if (rec) rec.outcome = response === "accept" ? "accepted" : response;

  const result: AckResult = { ok: true, events: [] };
  if (response !== "accept") {
    if (e.action === "suggest_step_down") { user.dismissals_in_a_row = 0; return result; } // "Keep guiding me"
    if (!e.safety) user.dismissals_in_a_row++;
    if (response === "later" && !e.safety) {
      // "Not now": wait twice as long before this kind of tip comes back.
      const base = policy.minTurnsBetweenTips[effectiveLevel(user)];
      const now = user.gaps[neverKey(e)] ?? (Number.isFinite(base) ? base : 3);
      user.gaps[neverKey(e)] = Math.min(now * 2, policy.maxTypeGap);
    }
    if (response === "never") user.never.push(neverKey(e));
    return result;
  }

  user.dismissals_in_a_row = 0;
  delete user.gaps[neverKey(e)]; // accepted: this kind of tip may come sooner again
  switch (e.action) {
    case "propose_memory": {
      const f = addFact(user, e.fact ?? "", e.fact_category, "chat");
      if (f) result.effect = { saved_fact: f.text };
      if (awardCard(user, "remember_me", `Saved: ${e.fact}`)) {
        result.events.push(toEvent({ action: "award_card", ref: "remember_me", mood: "celebrate", text: "New card: Remember me!" }, true));
      }
      break;
    }
    case "suggest_lab": result.effect = { open_lab: e.ref }; break;
    case "assign_mission":
      user.missions.push({ id: e.ref!, status: "open", assigned_at: new Date().toISOString() });
      result.effect = { mission: e.ref };
      break;
    case "check_in_mission": {
      const m = user.missions.find((x) => x.id === e.ref && x.status === "open");
      if (m) m.status = "done";
      const card = challengeById(e.ref!)?.card;
      if (card && awardCard(user, card, `Completed challenge: ${e.ref}`)) {
        const ev = toEvent({ action: "award_card", ref: card, mood: "celebrate", text: `You did it! New card: ${cardById(card)!.title}` });
        record(user, ev);
        result.events.push(ev);
      }
      break;
    }
    case "suggest_step_down": user.level = "useful"; result.effect = { level: "useful" }; break;
  }
  return result;
}

export { awardCard };
