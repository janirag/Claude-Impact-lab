import { mascotChat } from "@/lib/orchestrator";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";

export const runtime = "nodejs";

// POST { message } -> { events } : the user talks to Clawd directly.
export async function POST(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  const body = await req.json().catch(() => null);
  if (typeof body?.message !== "string" || !body.message.trim()) return json({ error: "expected { message }" }, { status: 400, setCookie });
  const events = await withUser(id, (user) => mascotChat(user, body.message));
  return json({ events }, { setCookie });
}
