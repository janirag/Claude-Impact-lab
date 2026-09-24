import { returnVisit } from "@/lib/orchestrator";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";

export const runtime = "nodejs";

// POST -> { events }: greeting and challenge check-in on a return visit (the demo's "one week later").
export async function POST(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  return json({ events: await withUser(id, (u) => returnVisit(u)) }, { setCookie });
}
