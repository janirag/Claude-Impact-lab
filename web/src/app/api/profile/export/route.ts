import { exportProfile } from "@/lib/profile";
import { userIdFrom } from "@/lib/session";
import { loadUser } from "@/lib/store";

export const runtime = "nodejs";

// GET -> "My AI profile" as plain text for any assistant.
export async function GET(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  const headers = new Headers({ "content-type": "text/plain; charset=utf-8" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(exportProfile(await loadUser(id)), { headers });
}
