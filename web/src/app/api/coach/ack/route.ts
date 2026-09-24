import { acknowledge } from "@/lib/policy";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";

export const runtime = "nodejs";

// POST { event_id, response: "accept" | "later" | "never" }
export async function POST(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  const body = await req.json().catch(() => null);
  const response = body?.response;
  if (typeof body?.event_id !== "string" || !["accept", "later", "never"].includes(response)) {
    return json({ error: "expected { event_id, response: accept|later|never }" }, { status: 400, setCookie });
  }
  const result = await withUser(id, async (user) => acknowledge(user, body.event_id, response));
  return json(result, { status: result.ok ? 200 : 404, setCookie });
}
