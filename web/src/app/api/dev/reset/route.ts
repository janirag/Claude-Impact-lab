import { json, userIdFrom } from "@/lib/session";
import { deleteUser } from "@/lib/store";

export const runtime = "nodejs";

// POST -> wipes this browser's user record ("Reset demo"). Disabled in production.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" && process.env.CLAWD_ALLOW_RESET !== "1") return json({ error: "disabled" }, { status: 403 });
  const { id, setCookie } = userIdFrom(req);
  await deleteUser(id);
  return json({ ok: true }, { setCookie });
}
