import { labById, labInLanguage } from "@/lib/catalog";
import { guessLanguage, isLanguage, parseAcceptLanguage } from "@/lib/i18n";
import { completeLab, validateAnswers } from "@/lib/lab";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ missionId: string }> };

// GET ?lang=ca|es|en -> the mission and its steps, for the Lab screen. Without ?lang, the browser's Accept-Language.
// Each step's `labels` are shown; its `options` (English) are what POST accepts.
export async function GET(req: Request, { params }: Ctx) {
  const m = labById((await params).missionId);
  if (!m) return json({ error: "not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("lang");
  const lang = isLanguage(q) ? q : guessLanguage(parseAcceptLanguage(req.headers.get("accept-language")));
  return json(labInLanguage(m, lang));
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
