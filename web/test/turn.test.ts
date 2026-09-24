import { afterAll, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { handleTurn, returnVisit, validateTurn } from "@/lib/orchestrator";
import { loadUser, withUser } from "@/lib/store";
import type { CoachEvent } from "@/lib/types";

// Runs in offline mode (see vitest.config.ts): no network, deterministic coach.

afterAll(() => rm(".data-test", { recursive: true, force: true }));

async function turn(id: string, message: string) {
  let text = "";
  const coach: CoachEvent[] = [];
  let done = false;
  await withUser(id, (u) => handleTurn(u, { message }, { token: (t) => { text += t; }, answerDone: () => { done = true; }, coach: (e) => coach.push(e) }));
  return { text, coach, done };
}

describe("turn flow (offline)", () => {
  it("validates input", () => {
    expect(validateTurn({ message: "" })).toBe("empty message");
    expect(validateTurn({ message: "hi", attachment: { media_type: "text/html", data: "x" } })).toMatch(/only images/);
    expect(validateTurn({ message: " hola " })).toEqual({ message: "hola", attachment: undefined });
  });

  it("streams an answer, then the coach tips on a one-line prompt, and persists", async () => {
    const id = "turn-user-0001";
    const r = await turn(id, "Translate this to Catalan");
    expect(r.done).toBe(true);
    expect(r.text).toContain("Offline example");
    expect(r.coach[0]).toMatchObject({ action: "show_tip", point_at: "composer", deliver: "at_pause" });
    const u = await loadUser(id);
    expect(u.turn).toBe(1);
    expect(u.history).toHaveLength(2);
  });

  it("suggests the Lab after repeated translations", async () => {
    const id = "turn-user-0002";
    for (let i = 0; i < 3; i++) await turn(id, `Please translate this client email about invoice number ${i} to Catalan for me`);
    const r = await turn(id, "Please translate this other client email to Catalan as well today");
    expect(r.coach.map((e) => e.action)).toContain("suggest_lab");
  });

  it("safety tip for health questions, plus a quiet card", async () => {
    const r = await turn("turn-user-0003", "My doctor gave me these pills and I have pain in my stomach, is it normal?");
    expect(r.coach.find((e) => e.action === "show_tip")).toMatchObject({ safety: true, deliver: "now" });
    expect(r.coach.find((e) => e.action === "award_card")).toMatchObject({ ref: "check_before_trusting", quiet: true });
  });

  it("return visit greets the user", async () => {
    const events = await withUser("turn-user-0004", (u) => returnVisit(u));
    expect(events[0]).toMatchObject({ action: "show_tip", deliver: "now" });
  });
});
