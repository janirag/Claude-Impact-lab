import { newUserId } from "./store";

// Anonymous identity: a random ID in a cookie. No account needed to start.

const COOKIE = "clawd_uid";

export function userIdFrom(req: Request): { id: string; setCookie?: string } {
  const raw = req.headers.get("cookie") ?? "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-zA-Z0-9-]{8,64})`));
  if (match) return { id: match[1] };
  const id = newUserId();
  return {
    id,
    setCookie: `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`,
  };
}

export function json(data: unknown, init: ResponseInit & { setCookie?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (init.setCookie) headers.append("set-cookie", init.setCookie);
  return new Response(JSON.stringify(data), { ...init, headers });
}
