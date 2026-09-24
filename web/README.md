# Clawd Guide: backend

The agentic backend from [`research/mvp-plan.md`](../research/mvp-plan.md): an **orchestrator (code)** in front of a **task agent** (does the user's real task) and a **coach agent** (decides what Clawd does). Next.js API routes, TypeScript, Anthropic SDK.

## Run it

```bash
cd web
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY, or leave it empty for offline mode
npm run dev                  # http://localhost:3000
npm test                     # 22 tests, run offline
```

**Offline mode:** with no API key (or `CLAWD_OFFLINE=1`) the task agent returns canned answers and the coach follows simple rules. Use it for development, tests, and as a backup if the network fails during the demo.

## How a turn works

```
POST /api/turn ─▶ orchestrator
                   ├─ task agent (streams tokens)            ─▶ event: token …
                   │   first turn only: intent classifier     ─▶ event: answer_done
                   │   (learn vs just-do), runs in parallel
                   ├─ coach agent: proposes actions via tools
                   └─ policy decides: level, tip budget,     ─▶ event: coach (0–2)
                      "never" list, safety, step-down        ─▶ event: done
```

The coach only **proposes**. `src/lib/policy.ts` **decides** what reaches the screen: at most one bubble per turn (plus a quiet card award), a tip budget of one bubble every 2 turns, safety tips always allowed, "never" respected, and an offer to switch to *Only when useful* after 2 dismissals in a row.

## Endpoints

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/turn` | `{ message, attachment?: { media_type, data (base64) } }` (images or PDF, up to 5 MB) | SSE: `token` `{text}` … `answer_done` `{refused, offline}` → `coach` (CoachEvent) … → `done` (or `error`) |
| `POST /api/coach/ack` | `{ event_id, response: "accept" \| "later" \| "never" }` | `{ ok, effect?: { open_lab, level, saved_fact, mission }, events }` |
| `POST /api/mascot` | `{ message }` | `{ events }`: Clawd's reply when the user taps it and asks something |
| `GET /api/lab/:missionId` | | Mission and steps (same content as the prototype's Lab) |
| `POST /api/lab/:missionId` | `{ answers: { [stepKey]: option \| option[] } }` | `{ saved: ["From now on, Claude will …"], events }` |
| `GET /api/profile` | | Level, profile, skills, cards, challenges, Labs ("What Clawd remembers") |
| `PATCH /api/profile` | `{ name?, language?, answer_style?, context?, level? }` (`null` clears a field) | Same as GET |
| `DELETE /api/profile` | `?fact=<id>` \| `?skill=<id>` \| `?all=1` | Same as GET |
| `GET /api/profile/export` | | "My AI profile" as plain text for any assistant |
| `POST /api/session/return` | | `{ events }`: greeting and challenge check-in (the demo's "one week later") |
| `POST /api/dev/reset` | | Wipes this browser's user. Off in production unless `CLAWD_ALLOW_RESET=1`. |

The user is identified by an anonymous `clawd_uid` cookie. No account is needed.

### CoachEvent: what the frontend renders

```ts
{
  id, action,          // show_tip | award_card | propose_memory | suggest_lab | assign_mission | check_in_mission | suggest_step_down
  text?, ref?,         // ref = card / Lab mission / challenge id
  mood,                // curious | happy | thoughtful | celebrate  -> which Clawd clip or state
  point_at?,           // upload_button | composer | answer_notes | card_shelf | lab_button -> where Clawd walks
  deliver,             // "now" | "at_pause": wait until the user stops typing or scrolling
  quiet?,              // update the UI (e.g. card shelf) with no speech bubble
  safety?,
  buttons?             // [{ id: accept|later|never, label }] -> send the id to /api/coach/ack
}
```

## Code map

| File | Role |
|---|---|
| `src/lib/orchestrator.ts` | Turn flow, mascot chat, return visit |
| `src/lib/policy.ts` | The rules: `decide()` (what to show) and `acknowledge()` (what a tap does) |
| `src/lib/agents/task.ts` | Task agent: streaming, web search, images and PDFs, `pause_turn` handling |
| `src/lib/agents/coach.ts` | Coach agent: SDK tool runner, one Zod-validated tool per action |
| `src/lib/agents/intent.ts` | First-turn learn vs just-do classifier (structured output) |
| `src/lib/agents/offline.ts` | Canned answers and rule-based coach |
| `src/lib/prompts.ts` | System prompts and the coach's context |
| `src/lib/profile.ts` | "About the user" block, facts, export |
| `src/lib/lab.ts` | Lab missions: validate answers, save profile and skills, award a card |
| `src/lib/catalog.ts` | Fixed cards, Lab missions and real-life challenges |
| `src/lib/store.ts` | JSON-file user store with a per-user lock (swap for SQLite or Postgres later) |

## Models and settings

- Both agents use `claude-opus-5` by default (`TASK_MODEL`, `COACH_MODEL`). The task agent runs at effort `medium`, and the coach and classifier at `low`.
- Server-side refusal fallback (`fallbacks: "default"`) is on for the task and coach agents.
- The stable system prompt is cached (`cache_control`), and the per-user profile comes after it.

## Not done yet

- **Live mode hasn't been run yet.** There was no API key on the dev machine, so only offline mode has been tested end to end. The first run with a key should check a full turn, a photo, and the coach's tool calls.
- The JSON store is single-server only. Use a database if it's hosted with more than one instance.
