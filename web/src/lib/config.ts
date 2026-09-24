export const config = {
  taskModel: process.env.TASK_MODEL || "claude-opus-5",
  coachModel: process.env.COACH_MODEL || "claude-opus-5",
  dataDir: process.env.CLAWD_DATA_DIR || ".data",
  // No credentials (or forced) -> canned answers + rule-based coach, so the demo never breaks.
  offline:
    process.env.CLAWD_OFFLINE === "1" ||
    (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN),
};

// Orchestrator policy knobs.
export const policy = {
  minTurnsBetweenTips: 2, // non-safety bubbles need this many user turns in between
  dismissalsBeforeStepDown: 2, // matches the prototype: offer "Only when useful" after 2 dismissals
  historyLimit: 20,
  maxFacts: 20,
  maxAttachmentBytes: 5 * 1024 * 1024,
};
