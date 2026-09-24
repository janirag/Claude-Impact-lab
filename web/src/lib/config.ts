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
  // Interruption budget per help level (research/user-flows.html, Flow 6; values "to test").
  // Safety tips, cards and replies to the user's own questions are exempt.
  // Guide me started at the map's 3 turns; playtesting found Clawd too quiet, so it is back to 2.
  minTurnsBetweenTips: { guide: 2, useful: 3, off: Infinity } as const, // turns between unprompted bubbles
  tipsPerSession: { guide: 3, useful: 1, off: 0 } as const, // per visit: see sessionIdleMinutes
  sessionIdleMinutes: 30, // a new visit (fresh budget) after this long without a turn, or on a return visit
  maxTypeGap: 24, // "Not now" doubles the gap for that tip type, up to this many turns
  dismissalsBeforeStepDown: 2, // matches the prototype: offer "Only when useful" after 2 dismissals
  historyLimit: 20,
  maxFacts: 20,
  maxAttachmentBytes: 5 * 1024 * 1024,
};
