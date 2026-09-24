import { config } from "@/lib/config";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";
import { view } from "@/lib/view";

export const runtime = "nodejs";

// GET -> "What Clawd remembers" + progress. `backend.offline` tells the prototype whether answers are canned.
export async function GET(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  return json({ ...(await withUser(id, async (u) => view(u))), backend: { offline: config.offline } }, { setCookie });
}

// PATCH { name?, language?, answer_style?, context?, level?, mode? }
export async function PATCH(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  const b = (await req.json().catch(() => null)) ?? {};
  const bad = (k: string, ok: readonly unknown[]) => b[k] !== undefined && b[k] !== null && !ok.includes(b[k]);
  if (bad("language", ["ca", "es", "en"]) || bad("answer_style", ["short", "detailed", "visual"]) ||
      bad("context", ["personal", "work", "study"]) || bad("level", ["guide", "useful", "off"]) || bad("mode", ["learn", "do"]) ||
      (b.name !== undefined && b.name !== null && typeof b.name !== "string")) {
    return json({ error: "invalid field" }, { status: 400, setCookie });
  }
  const out = await withUser(id, async (u) => {
    for (const k of ["name", "language", "answer_style", "context"] as const) {
      if (b[k] === null) delete u.profile[k];
      else if (b[k] !== undefined) (u.profile as Record<string, unknown>)[k] = k === "name" ? String(b[k]).slice(0, 60) : b[k];
    }
    if (b.level) { u.level = b.level; u.dismissals_in_a_row = 0; }
    if (b.mode === null) delete u.mode;
    else if (b.mode) u.mode = b.mode; // from onboarding: "I have something to get done" -> do
    return view(u);
  });
  return json(out, { setCookie });
}

// DELETE ?fact=<id> | ?skill=<id> | ?all=1
export async function DELETE(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  const q = new URL(req.url).searchParams;
  const out = await withUser(id, async (u) => {
    if (q.get("all") === "1") { u.profile = { facts: [] }; u.skills = []; }
    if (q.get("fact")) u.profile.facts = u.profile.facts.filter((f) => f.id !== q.get("fact"));
    if (q.get("skill")) u.skills = u.skills.filter((s) => s.id !== q.get("skill"));
    return view(u);
  });
  return json(out, { setCookie });
}
