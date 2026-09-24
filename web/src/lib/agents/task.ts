import type Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { taskSystem } from "../prompts";
import type { User } from "../types";
import { anthropic, fallback } from "./client";

export type Attachment = { media_type: string; data: string; name?: string };

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

function userContent(text: string, attachment?: Attachment): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (attachment?.media_type === "application/pdf") {
    blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } });
  } else if (attachment && (IMAGE_TYPES as readonly string[]).includes(attachment.media_type)) {
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: attachment.media_type as (typeof IMAGE_TYPES)[number], data: attachment.data },
    });
  }
  blocks.push({ type: "text", text: text || "What does this say, and what do I need to do?" });
  return blocks;
}

export type TaskResult = { text: string; refused: boolean };

// Streams the answer to the user's real task. Calls onText with each delta, and onSearch when a web search starts.
export async function runTask(
  user: User,
  text: string,
  attachment: Attachment | undefined,
  onText: (delta: string) => void,
  signal?: AbortSignal,
  situation?: string,
  onSearch?: () => void,
): Promise<TaskResult> {
  const [stable, ...rest] = taskSystem(user, situation);
  const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: "text", text: stable, cache_control: { type: "ephemeral" } }];
  for (const text of rest) system.push({ type: "text", text });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...user.history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: userContent(text, attachment) },
  ];

  let out = "";
  // pause_turn: a long server-side web search paused; send the partial turn back to continue.
  for (let hop = 0; hop < 3; hop++) {
    const stream = anthropic().beta.messages.stream(
      {
        ...fallback(),
        model: config.taskModel,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system,
        messages,
        // The basic search tool: web_search_20260209 filters results in code execution, which took
        // ~100 s before the first word on the rental contract flow (vs ~30 s with this one).
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      },
      { signal },
    );
    stream.on("text", (delta) => {
      out += delta;
      onText(delta);
    });
    stream.on("streamEvent", (e) => {
      if (e.type === "content_block_start" && e.content_block.type === "server_tool_use" && e.content_block.name === "web_search") onSearch?.();
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") return { text: out, refused: true };
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content });
  }
  return { text: out, refused: false };
}
