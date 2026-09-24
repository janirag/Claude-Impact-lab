import { challengeById } from "@/lib/catalog";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";
import { view } from "@/lib/view";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// POST -> starts a real-life challenge from the panel. Completion happens on the return visit's check-in.
export async function POST(req: Request, { params }: Ctx) {
  const { id: challengeId } = await params;
  const { id, setCookie } = userIdFrom(req);
  if (!challengeById(challengeId)) return json({ error: "unknown challenge" }, { status: 404, setCookie });
  const out = await withUser(id, async (u) => {
    if (!u.missions.some((m) => m.id === challengeId && m.status === "open")) {
      u.missions = u.missions.filter((m) => m.id !== challengeId);
      u.missions.push({ id: challengeId, status: "open", assigned_at: new Date().toISOString() });
    }
    return view(u);
  });
  return json(out, { setCookie });
}
