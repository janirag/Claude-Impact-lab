import { config, policy } from "./config";
import { runCoach } from "./agents/coach";
import { classifyIntent } from "./agents/intent";
import { offlineAnswer, offlineCoach } from "./agents/offline";
import { runTask, IMAGE_TYPES, type Attachment } from "./agents/task";
import { decide } from "./policy";
import type { CoachMode } from "./prompts";
import type { CoachAction, CoachEvent, User } from "./types";

export type TurnInput = { message: string; attachment?: Attachment };

export type TurnEmit = {
  token: (text: string) => void;
  answerDone: (info: { refused: boolean; offline: boolean }) => void;
  coach: (event: CoachEvent) => void;
};

export function validateTurn(input: unknown): TurnInput | string {
  const i = input as Partial<TurnInput> | null;
  const message = typeof i?.message === "string" ? i.message.trim().slice(0, 8000) : "";
  const att = i?.attachment;
  if (att) {
    if (typeof att.data !== "string" || typeof att.media_type !== "string") return "invalid attachment";
    if (att.media_type !== "application/pdf" && !(IMAGE_TYPES as readonly string[]).includes(att.media_type)) return "only images (jpeg, png, gif, webp) and PDFs";
    if ((att.data.length * 3) / 4 > policy.maxAttachmentBytes) return "attachment too large (max 5 MB)";
  }
  if (!message && !att) return "empty message";
  return { message, attachment: att };
}

async function coach(user: User, mode: CoachMode, latest?: { user: string; assistant?: string }, signal?: AbortSignal): Promise<CoachAction[]> {
  if (config.offline) return offlineCoach(user, mode, latest);
  try {
    return await runCoach(user, mode, latest, signal);
  } catch (e) {
    console.error("coach failed, staying silent:", e);
    return []; // the coach failing must never break the user's task
  }
}

function remember(user: User, userText: string, answer: string, attachment?: Attachment) {
  const marker = attachment ? `[sent a ${attachment.media_type === "application/pdf" ? "PDF" : "photo"}] ` : "";
  user.history.push({ role: "user", text: marker + userText }, { role: "assistant", text: answer || "(no answer)" });
  if (user.history.length > policy.historyLimit) user.history.splice(0, user.history.length - policy.historyLimit);
}

// One chat turn: task agent streams the answer, then the coach suggests and the policy decides.
export async function handleTurn(user: User, input: TurnInput, emit: TurnEmit, signal?: AbortSignal) {
  user.turn++;
  const intent = user.turn === 1 && !user.mode && !config.offline
    ? classifyIntent(input.message, signal).catch(() => undefined)
    : Promise.resolve(undefined);

  let answer: string;
  let refused = false;
  if (config.offline) {
    answer = offlineAnswer(input.message, input.attachment);
    for (const chunk of answer.match(/.{1,24}/gs) ?? []) emit.token(chunk);
  } else {
    const res = await runTask(user, input.message, input.attachment, emit.token, signal);
    answer = res.text;
    refused = res.refused;
  }
  emit.answerDone({ refused, offline: config.offline });

  const mode = await intent;
  if (mode) user.mode = mode;

  // History is updated after the coach reads it, so "recent requests" includes this one via `latest`.
  const proposals = refused ? [] : await coach(user, "after_turn", { user: input.message, assistant: answer }, signal);
  remember(user, input.message, answer, input.attachment);
  for (const e of decide(user, proposals, "after_turn")) emit.coach(e);
}

// The user talks to Clawd directly (tap on the mascot).
export async function mascotChat(user: User, message: string): Promise<CoachEvent[]> {
  const proposals = await coach(user, "chat", { user: message.slice(0, 2000) });
  const reply = proposals.find((p) => p.action === "show_tip") ?? { action: "show_tip" as const, text: "Hmm, I'm not sure. Want to try it in the chat?", mood: "thoughtful" as const };
  return decide(user, [reply, ...proposals.filter((p) => p !== reply)], "chat");
}

// Return visit ("one week later" in the demo).
export async function returnVisit(user: User): Promise<CoachEvent[]> {
  return decide(user, await coach(user, "return"), "return");
}
