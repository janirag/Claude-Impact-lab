import { handleTurn, validateTurn } from "@/lib/orchestrator";
import { json, userIdFrom } from "@/lib/session";
import { withUser } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { message, attachment? } -> SSE: (token | searching)*, answer_done, coach*, done (or error)
export async function POST(req: Request) {
  const { id, setCookie } = userIdFrom(req);
  const input = validateTurn(await req.json().catch(() => null));
  if (typeof input === "string") return json({ error: input }, { status: 400, setCookie });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        await withUser(id, (user) =>
          handleTurn(user, input, {
            token: (text) => send("token", { text }),
            searching: () => send("searching", {}),
            answerDone: (info) => send("answer_done", info),
            coach: (event) => send("coach", event),
          }, req.signal),
        );
        send("done", {});
      } catch (e) {
        console.error("turn failed:", e);
        send("error", { message: "Something went wrong. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  const headers = new Headers({ "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(stream, { headers });
}
