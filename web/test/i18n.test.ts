import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { offlineAnswer, offlineCoach } from "@/lib/agents/offline";
import { CARDS, CHALLENGES, LAB_MISSIONS, SITUATIONS, labInLanguage } from "@/lib/catalog";
import { config } from "@/lib/config";
import { guessLanguage, parseAcceptLanguage, uiLanguage } from "@/lib/i18n";
import { decide } from "@/lib/policy";
import { coachContext, taskSystem } from "@/lib/prompts";
import { freshUser } from "@/lib/store";
import type { Language } from "@/lib/types";
import { view } from "@/lib/view";

const user = (ui?: Language, saved?: Language) => {
  const u = freshUser("test-user-i18n");
  if (ui) u.ui_language = ui;
  if (saved) u.profile.language = saved;
  return u;
};

// The prototype must stay a single file, so it has its own copy of the rule and the strings. Read them from it.
const html = readFileSync(new URL("../../prototype/index.html", import.meta.url), "utf8");
const protoGuess = (() => {
  const body = /function guessLanguage\(prefs = [^\n]*\{\n([\s\S]*?)\n {2}\}/.exec(html)?.[1];
  if (!body) throw new Error("guessLanguage not found in the prototype");
  return new Function("prefs", body) as (prefs: string[]) => string;
})();
const protoStrings = (() => {
  const src = /const I18N = (\{[\s\S]*?\n {2}\});\n {2}\/\/ -+ end of strings/.exec(html)?.[1];
  if (!src) throw new Error("I18N not found in the prototype");
  return new Function(`return ${src}`)() as Record<Language, Record<string, unknown>>;
})();

// Every key path in an object, with array lengths, so two languages can be compared.
const shape = (x: unknown, path = ""): string[] =>
  Array.isArray(x) ? [`${path}[${x.length}]`, ...x.flatMap((v, i) => shape(v, `${path}[${i}]`))]
    : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => shape(v, `${path}.${k}`))
    : [path];

const CASES: [string[], Language][] = [
  [["ca-ES"], "ca"],
  [["ca"], "ca"],
  [["ca-ES-valencia", "es"], "ca"],
  [["es-ES", "ca"], "ca"], // Spanish device with Catalan added: Catalan
  [["es-ES", "ca-ES", "en"], "ca"],
  [["es-ES", "en-US", "ca"], "es"], // English ranked above Catalan: first of es/en wins
  [["en-GB", "ca"], "en"],
  [["es-419"], "es"],
  [["fr-FR", "es"], "es"],
  [["fr-FR", "de"], "en"],
  [[], "en"],
  [["EN_us"], "en"],
];

describe("language detection", () => {
  it("picks the app language from the browser's list", () => {
    for (const [prefs, want] of CASES) expect(guessLanguage(prefs), prefs.join(",")).toBe(want);
  });

  it("the prototype uses the same rule", () => {
    for (const [prefs, want] of CASES) expect(protoGuess(prefs), prefs.join(",")).toBe(want);
  });

  it("reads Accept-Language by q value", () => {
    expect(parseAcceptLanguage("es-ES,es;q=0.9,ca;q=0.8,en;q=0.7")).toEqual(["es-ES", "es", "ca", "en"]);
    expect(parseAcceptLanguage("en;q=0.5, ca")).toEqual(["ca", "en"]);
    expect(parseAcceptLanguage("*, fr;q=0")).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(guessLanguage(parseAcceptLanguage("es-ES,es;q=0.9,ca;q=0.8,en;q=0.7"))).toBe("ca");
  });

  it("a saved language wins over the browser's; English when nothing is known", () => {
    expect(uiLanguage(user())).toBe("en");
    expect(uiLanguage(user("es"))).toBe("es");
    expect(uiLanguage(user("es", "ca"))).toBe("ca");
  });
});

describe("prompts use the app language only when nothing else says", () => {
  it("nothing saved: the task agent is told the app language, and to follow the user's own words", () => {
    const system = taskSystem(user("ca")).join("\n\n");
    expect(system).toContain("App language: Catalan");
    expect(system).toMatch(/if they write in another language, follow them/);
    expect(system).toMatch(/Answer in the language the user writes in/);
    expect(taskSystem(user()).join("\n")).toContain("App language: English");
  });

  it("a saved language replaces the app language", () => {
    const system = taskSystem(user("ca", "es")).join("\n\n");
    expect(system).toContain("Preferred language: Spanish (unless they write in another one)");
    expect(system).not.toContain("App language");
  });

  it("the coach sees the app language too", () => {
    expect(coachContext(user("es"), "return")).toContain("App language: Spanish");
    expect(coachContext(user("es", "ca"), "return")).toContain("App language: Catalan (their saved language)");
  });
});

describe("the three languages on screen", () => {
  it("the prototype has the same strings in English, Spanish and Catalan", () => {
    const en = shape(protoStrings.en);
    expect(en.length).toBeGreaterThan(150);
    expect(shape(protoStrings.es)).toEqual(en);
    expect(shape(protoStrings.ca)).toEqual(en);
  });

  it("every catalog item has Spanish and Catalan text, with the same ids and options", () => {
    for (const lang of ["es", "ca"] as const) {
      for (const x of [...CARDS, ...CHALLENGES, ...SITUATIONS, ...LAB_MISSIONS]) expect(x.tr?.[lang], `${x.id} ${lang}`).toBeDefined();
      for (const m of LAB_MISSIONS) {
        const l = labInLanguage(m, lang);
        expect(l.id).toBe(m.id);
        l.steps.forEach((st, i) => {
          expect(st.options).toEqual(m.steps[i].options); // what the API accepts never changes
          expect(st.labels, `${m.id}.${st.key}`).toHaveLength(st.options.length);
          if (m.steps[i].key !== "language") expect(st.labels).not.toEqual(st.options);
        });
      }
    }
  });

  it("the profile view is in the user's language", () => {
    const u = user("es");
    u.cards.push({ id: "give_context", earned_at: "", evidence: "" });
    const v = view(u);
    expect(v.language).toBe("es");
    expect(v.cards[0]).toMatchObject({ id: "give_context", title: "Da contexto" });
    expect(v.challenges.find((c) => c.id === "next_bill")?.title).toBe("Revisa tu próxima factura");
    expect(v.labs.find((l) => l.id === "you")?.title).toBe("Cuéntale a Claude quién eres");
    expect(v.cards[0]).not.toHaveProperty("tr");
  });

  it("Clawd's buttons and fixed bubbles follow the user's language", () => {
    const u = { ...user("ca"), turn: 3 };
    const [card, tip] = decide(u, [
      { action: "award_card", ref: "give_context", evidence: "x", mood: "celebrate" },
      { action: "show_tip", text: "Hola!", mood: "curious" },
    ], "after_turn");
    expect(card.text).toBe("Carta nova: Dona context!");
    expect(tip.buttons?.map((b) => b.label)).toEqual(["Entesos", "No em mostris consells així"]);
  });

  it("offline answers and coach speak the app language, and Clawd introduces itself in all three", () => {
    expect(offlineAnswer("hola", undefined, undefined, "es")).toContain("Ejemplo sin conexión");
    expect(offlineAnswer("", undefined, "letter", "ca")).toContain('"una carta que no entenc"');
    expect(offlineCoach(user("en"), "chat")[0].text).toBe("I'm Clawd! Ask me anything about these tools.");
    expect(offlineCoach(user("es"), "chat")[0].text).toMatch(/^¡Soy Clawd!/);
    expect(offlineCoach(user("ca"), "chat")[0].text).toMatch(/^Sóc en Clawd!/);
    for (const lang of ["en", "es", "ca"] as const) expect(protoStrings[lang].helloLead).toMatch(/Clawd/);
  });
});

describe("profile API", () => {
  // Its own data folder, so turn.test.ts cleaning up .data-test can't pull the file away mid-test.
  config.dataDir = ".data-test-i18n";
  afterAll(() => rm(".data-test-i18n", { recursive: true, force: true }));
  const req = (method: string, headers: Record<string, string>, body?: unknown) =>
    new Request("http://localhost/api/profile", { method, headers: { cookie: "clawd_uid=test-user-i18n-api", ...headers }, body: body ? JSON.stringify(body) : undefined });

  it("a new user's language comes from Accept-Language; the user's own pick wins after that", async () => {
    const { GET, PATCH } = await import("@/app/api/profile/route");
    let v = await (await GET(req("GET", { "accept-language": "es-ES,es;q=0.9,ca;q=0.8" }))).json();
    expect(v).toMatchObject({ ui_language: "ca", language: "ca" });
    expect((await PATCH(req("PATCH", {}, { ui_language: "fr" }))).status).toBe(400);
    v = await (await PATCH(req("PATCH", {}, { language: "es" }))).json();
    expect(v).toMatchObject({ ui_language: "ca", language: "es", profile: { language: "es" } });
    v = await (await GET(req("GET", { "accept-language": "en" }))).json();
    expect(v.language).toBe("es");
  });
});
