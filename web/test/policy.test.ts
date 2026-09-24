import { describe, expect, it } from "vitest";
import { acknowledge, decide, touchSession } from "@/lib/policy";
import { freshUser } from "@/lib/store";
import type { CoachAction } from "@/lib/types";

const user = () => ({ ...freshUser("test-user-0001"), turn: 5 });
const tip: CoachAction = { action: "show_tip", text: "Tell me who it's for", mood: "curious" };
const safety: CoachAction = { action: "show_tip", text: "Check this before acting", mood: "thoughtful", safety: true };

describe("decide", () => {
  it("stays silent on stay_silent", () => {
    expect(decide(user(), [{ action: "stay_silent", mood: "happy" }], "after_turn")).toEqual([]);
  });

  it("shows at most one bubble, highest priority first", () => {
    const u = user();
    const out = decide(u, [tip, { action: "suggest_lab", ref: "clients", text: "Teach me?", mood: "curious" }], "after_turn");
    expect(out).toHaveLength(1);
    expect(out[0].action).toBe("suggest_lab");
    expect(u.pending[out[0].id]).toBeDefined();
  });

  it("enforces the gap between tips but lets safety through", () => {
    const u = user();
    expect(decide(u, [tip], "after_turn")).toHaveLength(1);
    u.turn++;
    expect(decide(u, [tip], "after_turn")).toHaveLength(0);
    expect(decide(u, [safety], "after_turn")).toHaveLength(1);
    u.turn += 1;
    expect(decide(u, [tip], "after_turn")).toHaveLength(0); // 1 turn after the safety bubble: too soon
    u.turn += 1;
    expect(decide(u, [tip], "after_turn")).toHaveLength(1);
  });

  it("isn't too quiet: in Guide me, a tip every other turn up to 3 per visit", () => {
    const u = { ...user(), turn: 0 };
    const shown: number[] = [];
    for (let t = 1; t <= 8; t++) { u.turn = t; if (decide(u, [tip], "after_turn").length) shown.push(t); }
    expect(shown).toEqual([1, 3, 5]);
  });

  it("a pause of more than 30 minutes starts a new visit with a fresh budget", () => {
    const u = user();
    const t0 = new Date("2026-09-24T10:00:00Z");
    touchSession(u, t0);
    u.session.tips = 3;
    touchSession(u, new Date("2026-09-24T10:20:00Z"));
    expect(u.session.tips).toBe(3); // same visit
    touchSession(u, new Date("2026-09-24T11:00:00Z"));
    expect(u.session.tips).toBe(0); // new visit
  });

  it("Guide me: at most 3 unprompted bubbles per session, reset by a return visit", () => {
    const u = user();
    for (let i = 0; i < 3; i++) { expect(decide(u, [tip], "after_turn")).toHaveLength(1); u.turn += 3; }
    expect(decide(u, [tip], "after_turn")).toEqual([]);
    expect(decide(u, [safety], "after_turn")).toHaveLength(1); // safety is never capped
    u.session = { started_turn: u.turn, tips: 0 }; // what returnVisit() does
    u.turn += 3;
    expect(decide(u, [tip], "after_turn")).toHaveLength(1);
  });

  it("Only when useful: one unprompted bubble per session", () => {
    const u = { ...user(), level: "useful" as const };
    const mem = (fact: string): CoachAction => ({ action: "propose_memory", fact, fact_category: "x", text: "Remember?", mood: "curious" });
    expect(decide(u, [mem("Vegetarian")], "after_turn")).toHaveLength(1);
    u.turn += 5;
    expect(decide(u, [mem("Has two kids")], "after_turn")).toEqual([]);
  });

  it("'Not now' doubles the wait for that tip type only; accepting resets it", () => {
    const u = user();
    const lab: CoachAction = { action: "suggest_lab", ref: "clients", text: "Teach me?", mood: "curious" };
    const [e] = decide(u, [lab], "after_turn");
    acknowledge(u, e.id, "later");
    expect(u.gaps["suggest_lab:clients"]).toBe(4);
    u.turn += 3;
    expect(decide(u, [lab], "after_turn")).toEqual([]); // same type: needs 4 turns
    const [other] = decide(u, [tip], "after_turn"); // another type: the normal 2-turn gap applies
    expect(other.action).toBe("show_tip");
    acknowledge(u, other.id, "accept");
    u.turn += 3;
    const [again] = decide(u, [lab], "after_turn");
    expect(again.action).toBe("suggest_lab");
    acknowledge(u, again.id, "accept");
    expect(u.gaps["suggest_lab:clients"]).toBeUndefined();
  });

  it("level off shows nothing, level useful drops generic tips", () => {
    const off = { ...user(), level: "off" as const };
    expect(decide(off, [safety], "after_turn")).toEqual([]);
    const useful = { ...user(), level: "useful" as const };
    expect(decide(useful, [tip], "after_turn")).toEqual([]);
    expect(decide(useful, [safety], "after_turn")).toHaveLength(1);
  });

  it("'just do it' users are treated as 'only when useful'", () => {
    const u = { ...user(), mode: "do" as const };
    expect(decide(u, [tip], "after_turn")).toEqual([]);
  });

  it("...unless they explicitly chose Guide me", () => {
    const u = { ...user(), mode: "do" as const, level_set_by_user: true };
    expect(decide(u, [tip], "after_turn")).toHaveLength(1);
  });

  it("awards a card once, quietly when a bubble is also shown", () => {
    const u = user();
    const card: CoachAction = { action: "award_card", ref: "ask_for_sources", evidence: "asked for sources", mood: "celebrate" };
    const out = decide(u, [card, tip], "after_turn");
    expect(out.map((e) => [e.action, !!e.quiet])).toEqual([["award_card", true], ["show_tip", false]]);
    expect(u.cards.map((c) => c.id)).toEqual(["ask_for_sources"]);
    u.turn += 3;
    expect(decide(u, [card], "after_turn")).toEqual([]);
  });

  it("'never' on tips still lets Clawd answer when the user asks it directly", () => {
    const u = user();
    const [e] = decide(u, [tip], "after_turn");
    acknowledge(u, e.id, "never");
    u.turn += 3;
    expect(decide(u, [tip], "after_turn")).toEqual([]);
    const [reply] = decide(u, [tip], "chat");
    expect(reply).toMatchObject({ action: "show_tip", deliver: "now" });
    expect(reply.buttons).toBeUndefined();
  });

  it("rejects unknown catalog ids", () => {
    expect(decide(user(), [{ action: "award_card", ref: "made_up", mood: "celebrate" }], "after_turn")).toEqual([]);
    expect(decide(user(), [{ action: "suggest_lab", ref: "connect", text: "x", mood: "curious" }], "after_turn")).toEqual([]);
  });

  it("offers to step down after two dismissals in a row", () => {
    const u = user();
    for (let i = 0; i < 2; i++) {
      const [e] = decide(u, [tip], "after_turn");
      acknowledge(u, e.id, "later");
      u.turn += 12; // past the doubled gap for this tip type
    }
    const [e] = decide(u, [tip], "after_turn");
    expect(e.action).toBe("suggest_step_down");
    expect(acknowledge(u, e.id, "accept").effect).toEqual({ level: "useful" });
    expect(u.level).toBe("useful");
  });
});

describe("acknowledge", () => {
  it("saves memory only on accept, and awards Remember me", () => {
    const u = user();
    const [e] = decide(u, [{ action: "propose_memory", fact: "Vegetarian", fact_category: "food", text: "Remember that?", mood: "curious" }], "after_turn");
    const res = acknowledge(u, e.id, "accept");
    expect(res.effect?.saved_fact).toBe("Vegetarian");
    expect(u.profile.facts.map((f) => f.text)).toEqual(["Vegetarian"]);
    expect(u.cards.map((c) => c.id)).toContain("remember_me");
  });

  it("'never' blocks that suggestion for good", () => {
    const u = user();
    const lab: CoachAction = { action: "suggest_lab", ref: "clients", text: "Teach me?", mood: "curious" };
    const [e] = decide(u, [lab], "after_turn");
    acknowledge(u, e.id, "never");
    u.turn += 5;
    expect(decide(u, [lab], "after_turn")).toEqual([]);
  });

  it("challenge: assign, check in, complete with a card", () => {
    const u = user();
    const [a] = decide(u, [{ action: "assign_mission", ref: "next_bill", text: "Try this?", mood: "happy" }], "after_turn");
    acknowledge(u, a.id, "accept");
    expect(u.missions).toMatchObject([{ id: "next_bill", status: "open" }]);
    const [c] = decide(u, [{ action: "check_in_mission", ref: "next_bill", text: "How did it go?", mood: "happy" }], "return");
    const res = acknowledge(u, c.id, "accept");
    expect(u.missions[0].status).toBe("done");
    expect(res.events[0]).toMatchObject({ action: "award_card", ref: "show_a_photo" });
  });

  it("unknown event id is a no-op", () => {
    expect(acknowledge(user(), "nope", "accept").ok).toBe(false);
  });
});
