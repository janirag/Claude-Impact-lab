import { labById } from "@/lib/catalog";
import { completeLab, validateAnswers } from "@/lib/lab";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ missionId: string }> };

// GET -> the mission and its steps, for the Lab screen.
export async function GET(_req: Request, { params }: Ctx) {
  const m = labById((await params).missionId);
  return m ? json(m) : json({ error: "not found" }, { status: 404 });
}

// POST { answers: { [stepKey]: option | option[] } } -> { saved: [...], events }
export async function POST(req: Request, { params }: Ctx) {
  const { missionId } = await params;
  const { id, setCookie } = userIdFrom(req);
  const body = await req.json().catch(() => null);
  const error = validateAnswers(missionId, body?.answers ?? {});
  if (error) return json({ error }, { status: 400, setCookie });
  const result = await withUser(id, async (user) => completeLab(user, missionId, body.answers));
  return json(result, { setCookie });
}
