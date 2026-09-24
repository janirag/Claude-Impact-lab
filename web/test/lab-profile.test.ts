import { describe, expect, it } from "vitest";
import { completeLab, validateAnswers } from "@/lib/lab";
import { aboutUser, exportProfile } from "@/lib/profile";
import { freshUser } from "@/lib/store";

const answers = { role: "Office admin", tone: "Warm and formal (vostè)", rules: ["Keep prices and dates exactly as I wrote them", "Flag anything a client could misread"] };

describe("lab", () => {
  it("validates answers against the catalog", () => {
    expect(validateAnswers("clients", answers)).toBeNull();
    expect(validateAnswers("clients", { ...answers, tone: "Pirate" })).toMatch(/invalid option/);
    expect(validateAnswers("clients", { role: "Office admin" })).toMatch(/missing/);
    expect(validateAnswers("connect", {})).toMatch(/unavailable/);
  });

  it("the clients mission saves a skill that reaches the task prompt", () => {
    const u = freshUser("test-user-0002");
    const { saved, events } = completeLab(u, "clients", answers);
    expect(saved[0]).toBe("know you write to clients as office admin");
    expect(events[0]).toMatchObject({ action: "award_card", ref: "set_my_style" });
    expect(aboutUser(u)).toContain("Tone for client emails: Warm and formal (vostè).");
    expect(aboutUser(u)).toContain("Notes for you");
    expect(u.labs_done).toEqual(["clients"]);
  });

  it("the 'you' mission fills the profile and export works", () => {
    const u = freshUser("test-user-0003");
    completeLab(u, "you", { context: "Work", language: "Català", style: "Short" });
    expect(u.profile).toMatchObject({ context: "work", language: "ca", answer_style: "short" });
    expect(exportProfile(u)).toContain("Preferred language: Catalan");
  });

  it("empty profile adds nothing to the prompt", () => {
    expect(aboutUser(freshUser("test-user-0004"))).toBe("");
  });
});
