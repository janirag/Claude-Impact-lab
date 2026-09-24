import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { config } from "../config";
import { anthropic } from "./client";

const Intent = z.object({ mode: z.enum(["learn", "do"]) });

// First turn only: does the user want to learn, or just get the task done? Runs alongside the task agent.
export async function classifyIntent(text: string, signal?: AbortSignal): Promise<"learn" | "do"> {
  const res = await anthropic().messages.parse(
    {
      model: config.coachModel,
      max_tokens: 1000,
      output_config: { effort: "low", format: zodOutputFormat(Intent) },
      messages: [{
        role: "user",
        content: `Someone opened an AI helper and wrote the message below. Are they mainly curious to learn how to use AI ("learn"), or do they just want a task done ("do")? When unsure, answer "do".\n\n${text.slice(0, 1000)}`,
      }],
    },
    { signal },
  );
  return res.parsed_output?.mode ?? "do";
}
