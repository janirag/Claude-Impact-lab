# MVP plan: AI coach with a pet mascot

*Working plan, September 2026. Claude Impact Lab. Still in the design phase: items marked **Open** are not decided yet.*

**Builds on:** [basic chat AI users in Barcelona](barcelona-ai-users.md), the [onboarding mockup meeting note](../notes/2026-09-24-claude-onboarding-mockup.md), the [Clawd Guide prototype](../prototype/index.html) and the [mascot animation clips](../animations/). See section 4.

---

## 1. The idea

A webpage with a small mascot that coaches people on AI **while they do their real tasks**. It isn't a separate course.

In one line: **every lesson is a real task done, and the coach teaches the trick at the moment it matters.**

### Beyond the Duolingo experience

| Duolingo | Our approach |
|---|---|
| Made-up exercises | **The user's real tasks**: a letter, a bill, a trip, an email |
| Learn now, use it "someday" | Learning happens **while doing the real thing** |
| Progress = XP and streaks | Progress = **things actually done** ("understood 3 letters") |
| Keeps you coming back through guilt | You come back because **life gives you a reason** |
| Skills stay inside the app | What you learn works in **any** assistant |

### The loop

1. **Bring something real.** "What do you need help with today?" A photo, a text or a question.
2. **Do it together.** Claude handles the task; the mascot sits at the side.
3. **Coach at the right moment.** The mascot appears only when there's something to learn.
4. **Keep the lesson.** Each trick becomes a **card** in the user's collection, linked to the moment it was earned.
5. **Take it into the world.** Each session ends with a small **real-world mission**, which is checked on the next visit.

### Scope: how far "real world" goes

| Level | Description | Status |
|---|---|---|
| A. Real tasks | The loop above | MVP |
| B. Real-life triggers | Home screen shows situations (letter from Hisenda, rental contract, doctor, trip, homework), not lessons | MVP |
| C. Real places and people | Missions that point offline (show a friend, libraries, community centres) | Pitch only, next step |

### What the research says, and how the plan uses it

- **Basic users are on ChatGPT and Gemini** (Claude 2–8%). Teach ideas in plain words, never Claude-specific jargon ("remember this for next time", not "project-level memory").
- **Use is probably mostly on mobile** (no measured data). The webpage is designed mobile-first.
- **Barcelona mixes Catalan, Spanish and English, and translation is a top use.** The product is multilingual from day one.
- **65% say they check answers, only 38% click through to sources.** "How to check what Claude told you" is a core stage and the main impact story.
- **Almost nobody sets up a profile**, yet it makes answers much better. Profile setup is the core value, made interactive.

### Demo story (about 3 minutes, hero persona: Carmen, 52)

Carmen opens the page on her phone and picks **"I got a letter I don't understand"**. She uploads a photo of an official letter and gets a plain explanation in Spanish. The mascot pops up: "This is about money. Want to see how to check it?" She earns the card **"Check before trusting"** and gets a mission: "When your next bill arrives, try this." Then we skip to "one week later": the mascot remembers her and unlocks a second card.

---

## 2. System architecture

### Overview: an orchestrator in front of the agents

```
          events: message · photo · tap mascot · tap card · return visit · pick situation
                                        │
                        ┌───────────────▼────────────────┐
                        │  ORCHESTRATOR (code)           │
                        │  • routing table by event      │
                        │  • owns mode, tip budget,      │
                        │    dismissals, safety rules    │
                        │  • filters coach actions       │
                        │  • small classifier call only  │
                        │    when intent is unclear      │
                        └──┬─────────────┬────────────┬──┘
                           │             │            │
                 ┌─────────▼───┐   ┌─────▼──────┐   ┌─▼──────────────┐
                 │ TASK AGENT  │   │ COACH      │   │ (later) more   │
                 │ does the job│   │ suggests   │   │ agents: safety,│
                 │ (streams)   │   │ tip/card/  │   │ translation,   │
                 └──────┬──────┘   │ memory/    │   │ missions...    │
                        │          │ mission    │   └────────────────┘
                        │          └─────┬──────┘
                    ┌───▼────────────────▼────────────────────┐
                    │  User store: profile · cards · missions │
                    │  · tip history · learn/do mode          │
                    └─────────────────────────────────────────┘
```

**Why the orchestrator is code and not an LLM:**

- **Speed:** an LLM routing call would add roughly 1–2 seconds before the first word of every answer.
- **It isn't really a choice:** the coach runs *after* the task agent on the same turn. The main flow is always "answer, then maybe coach".
- **Predictability:** code routing is cheaper, easier to debug, and makes the demo repeatable.

The interface lets us swap in an LLM router later, if we end up with 4 or more specialist agents and free-form messages that could go to any of them.

### Orchestrator routing table

| Event | What happens |
|---|---|
| Chat message or photo | Task agent (streams) → coach runs in the background → orchestrator filters the coach's suggestion → bubble shown or not |
| Tap on the mascot / message to it | Coach in conversation mode ("what does this card mean?") |
| Picks a situation | Sets context and mode; the task agent opens with a guided first step |
| Return visit with an open mission | Coach runs the mission check-in |
| Unclear intent (learn vs just do) | Small classifier call that **runs alongside** the task agent, so it adds no wait |

**Rules the orchestrator enforces:**

- **Not pushy:** at most one bubble every N turns. "Never show again" is a hard block. In "just get it done" mode, only safety tips appear.
- **Consent for memory:** nothing is saved to the profile without a tap from the user.
- **Safety tips always get through:** for health, legal or money topics, and when personal data is pasted.
- **Only at pauses:** coach output is held until the user isn't typing, reading or scrolling, based on signals from the frontend.

### Task agent ("Claude")

- Does the real task, with streamed answers.
- Accepts **images and PDFs** (for example Carmen's letter).
- Uses **web search** so answers can include sources, which feeds the "check before trusting" card.
- The user's profile (language, answer style, approved facts) goes into its system prompt, so the user sees that setting up a profile changes the answers.
- Answers in the user's language: Catalan, Spanish or English.

### Coach agent ("mini Claude"): the agentic part

After each answer it receives the last exchange, the profile, the user's progress and the card catalog. It then picks an action using tools:

| Tool | Effect | Example trigger |
|---|---|---|
| `stay_silent` | Nothing (the default) | Everything went well, or it tipped recently |
| `show_tip(message, cta)` | Mascot speech bubble | One-line prompt → "Tell me who it's for and I'll get the tone right" |
| `award_card(card_id, evidence)` | Unlocks a card, linked to the real moment | First time the user asks for sources |
| `propose_memory(fact)` | "Should I remember you're vegetarian?" Saved only on the user's yes | A personal detail comes up |
| `assign_mission(mission_id)` | Gives a real-world task at the end of a session | "When your next bill arrives, try this" |
| `check_in_mission()` | "How did checking your bill go?" | Return visit with an open mission |

Every coach action also carries `mood` (from a fixed list) and `point_at` (from a fixed set of screen anchors) for the mascot. See section 3.

The coach **suggests** and the orchestrator **decides** what reaches the screen.

### Data (MVP)

- **No account:** an anonymous ID in a cookie. The upgrade path to a full Claude account comes later.
- **One record per user:** `{ profile, mode, cards[], missions[], tip_history[], dismissed[] }`, stored in SQLite or a hosted Postgres.
- **Cards and missions are fixed catalog files,** not generated. Claude only decides *when* to award them, which keeps progress consistent.
- **Draft card set (8):** Give context · Show a photo · Ask for sources · Check before trusting · Remember me · Set my style · Translate with the right tone · Don't share secrets.
- **Profile export:** a "my AI profile" text that works in any assistant, including ChatGPT and Gemini.

### Memory: how it remembers preferences

**1. Capturing: three ways, always with consent**

| How | Example | What happens |
|---|---|---|
| **Asked at the start** (profile setup) | "Should I answer in Catalan or Spanish? Short or detailed?" | Saved right away, because the user chose it |
| **Mentioned in chat** | "I'm vegetarian", "it's for my mother" | The coach calls `propose_memory` and the mascot asks "Should I remember that?" Saved only on **yes**. |
| **Spotted from behaviour** | The user keeps asking for shorter answers | The coach proposes it: "You like it short, shall I always do that?" |

It never saves anything silently. Each "should I remember?" moment is also the lesson that teaches the **Remember me** card.

**2. Storage** (in the user record, keyed by the anonymous cookie ID; example values are made up)

```
profile: {
  name: "Carmen",
  language: "es",
  answer_style: "short",            // short | detailed | visual
  context: "personal",              // personal | work | study
  facts: [
    { text: "Vegetarian", category: "food", learned_from: "recipe chat", date: "2026-09-24" },
    { text: "Helps her mother with paperwork", category: "family", ... }
  ]
}
```

- **Fixed fields** for what every answer depends on, and a **short list of facts** for the rest (around 20 at most; the coach proposes merging or replacing old ones).
- **Sensitive details are stored only as general facts.** It can keep "manages her mother's paperwork", but never ID numbers, diagnoses or amounts, even if the user says yes.

**3. Using it**

1. On every turn, the orchestrator loads the profile.
2. It adds a short **"About the user"** section to the task agent's instructions, for example: *Answer in Spanish, keep it short, she's vegetarian, often helps her mother with official letters.*
3. The coach gets the profile too, so it doesn't repeat tips already learned and can use the user's name.

The profile is small, so it's sent in full every time. No memory search is needed for the MVP.

**4. Showing that it remembers**

- **The mascot sometimes mentions it:** "I kept it short, the way you like it 👌" or "Here's a vegetarian version." Just often enough for the user to connect the profile with better answers.
- **A "What Espurna remembers" screen:** every item can be seen, edited or deleted, with where it came from ("learned when we did the recipe").
- **Return visits:** "Hi Carmen! How did checking that bill go?" This uses the profile together with the open mission.

**Limitation:** with no account, the memory lives in one browser. Clearing it or switching phones loses the profile.

- **MVP:** cookie plus **profile export**, the "my AI profile" text to paste into ChatGPT, Gemini or Claude. It also teaches the most transferable lesson: *any* assistant can remember you if you set it up.
- **Later:** a code or email link to recover the profile, or connecting a real Claude account.
- **Demo:** the "one week later" button reloads with the same profile.

### Proposed stack

| Area | Proposal | Status |
|---|---|---|
| Language and framework | TypeScript + Next.js (frontend and API in one repo) | **Open**: confirm |
| Claude integration | Anthropic TypeScript SDK. Task agent streams; coach runs through the SDK tool runner with `strict` tool schemas so actions are always valid JSON | Proposed |
| Models | Claude Opus 5 for both agents. The coach can move to Sonnet 5 or Haiku 4.5 if cost matters. | **Open** |
| Refusals | API server-side model fallback, so a declined request is retried on another model and never leaves an empty bubble | Proposed |
| Hosting | Laptop for a live demo; hosted (for example Vercel) if judges open it on their phones | **Open** |

**Rough cost:** about $0.40–0.60 per 10-turn session on Opus 5. This is an estimate, not a measurement.

**Latency:** the coach runs in the background after the answer finishes streaming, so it adds no wait. Its bubble appears a second or two later.

### Build order (each step is demoable)

1. **Chat with the task agent:** streaming, photo upload, profile in the prompt.
2. **Orchestrator and coach loop:** routing table; `show_tip` and `stay_silent` shown as mascot bubbles.
3. **Cards:** catalog file, `award_card`, collection screen.
4. **Memory:** `propose_memory` with consent, profile screen, export.
5. **Missions:** `assign_mission` and the return-visit check-in (a "one week later" button for the demo).
6. **Later, not in the MVP:** scheduled reminders, real Barcelona places and partners, more specialist agents.

### Technical architecture

Updated with what we learned from the prototype (Clawd, the Lab, help levels, before/after). See section 4.

**Components**

```
┌───────────────────────────── BROWSER (mobile-first) ─────────────────────────────┐
│                                                                                   │
│  Chat UI              Clawd layer                     Panels                      │
│  ├ thread + stream    ├ Mascot state machine          ├ Lab (practice flow)       │
│  ├ composer + upload  │  idle·busy·curious·talking·   ├ Missions / cards          │
│  └ "Notes for you"    │  celebrate·flag·roam·sleep    ├ "What Clawd remembers"    │
│                       ├ Sprite (clips/SVG) + anchors  └ Before/after compare      │
│  Explainers           └ Signals: typing · scrolling · idle · reduced-motion       │
│  (orange dots)                                                                    │
│                                   ▲  SSE: answer tokens + coach events            │
└───────────────────────────────────┼───────────────────────────────────────────────┘
                                    │  HTTPS (anon cookie ID)
┌───────────────────────────────────┼──────────── BACKEND (Next.js API routes) ─────┐
│                                   ▼                                               │
│   ┌──────────────────────────────────────────────────────────┐                    │
│   │ ORCHESTRATOR (code)                                       │                   │
│   │ • event router      • help level: guide / useful / off    │                   │
│   │ • tip budget + dismissals (back off after 2)              │                   │
│   │ • safety overrides  • pause gate (from UI signals)        │                   │
│   │ • validates + filters coach actions before they reach UI  │                   │
│   └───────┬───────────────────────┬───────────────────┬───────┘                   │
│           │                       │                   │                           │
│   ┌───────▼────────┐     ┌────────▼────────┐   ┌──────▼────────┐                  │
│   │ TASK AGENT     │     │ COACH AGENT     │   │ LAB ENGINE    │                  │
│   │ Claude, stream │     │ Claude + strict │   │ (code) steps  │                  │
│   │ vision, web    │     │ tools, runs     │   │ from catalog; │                  │
│   │ search, profile│     │ after answer    │   │ writes profile│                  │
│   │ in system      │     │ (background)    │   │ + skills      │                  │
│   └───────┬────────┘     └────────┬────────┘   └──────┬────────┘                  │
│           └───────────────┬───────┴───────────────────┘                           │
│                   ┌───────▼─────────────────────────────┐   ┌───────────────────┐ │
│                   │ USER STORE (SQLite / Postgres)      │   │ CATALOGS (JSON)   │ │
│                   │ profile · skills · cards · missions │   │ cards · missions  │ │
│                   │ tip_history · dismissals · level    │   │ lab steps · anchors│ │
│                   └─────────────────────────────────────┘   └───────────────────┘ │
└───────────────────────────────────────┬───────────────────────────────────────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Anthropic API     │
                              │ Messages + tools, │
                              │ web search, vision│
                              └───────────────────┘
```

**One chat turn, step by step**

```
User        UI                 Orchestrator          Task agent        Coach agent       Store
 │ send msg  │                      │                      │                 │              │
 │──────────▶│ POST /api/turn ─────▶│ load user ──────────────────────────────────────────▶│
 │           │                      │ build system prompt  │                 │              │
 │           │                      │ (base + "About user" │                 │              │
 │           │                      │  + skills) ─────────▶│ stream          │              │
 │           │◀══ SSE tokens ═══════│◀═════════════════════│                 │              │
 │           │ Clawd: busy          │                      │ done            │              │
 │           │                      │ (in parallel, first turn only:         │              │
 │           │                      │  intent classifier learn vs do)        │              │
 │           │                      │── exchange + profile + progress ──────▶│              │
 │           │                      │                      │   tool call:    │              │
 │           │                      │◀──────── show_tip / award_card / ... ──│              │
 │           │                      │ filter: level? budget? dismissed?      │              │
 │           │                      │ safety override? ───────────── log ──────────────────▶│
 │           │◀══ SSE coach event ══│ {action, text, mood, point_at}         │              │
 │           │ Clawd: curious "!"   │                      │                 │              │
 │           │ (waits for pause,    │                      │                 │              │
 │           │  then walks to anchor + bubble)             │                 │              │
 │ tap "yes" │ POST /api/coach/ack ▶│ apply (save memory / start Lab) ────────────────────▶│
```

The user never waits for the coach. Answer tokens stream immediately, and the coach event arrives on the same connection 1–2 seconds after the answer ends.

**API surface**

| Endpoint | Purpose |
|---|---|
| `POST /api/turn` | Message and optional file → SSE stream: `token` events, then `answer_done`, then an optional `coach` event |
| `POST /api/coach/ack` | The user's response to a bubble: `accept` / `later` / `never` (updates dismissals and budget, applies memory) |
| `POST /api/mascot` | Messages sent directly to Clawd (coach in conversation mode) |
| `GET/POST /api/lab/:missionId` | Lab steps from the catalog; on the last step, writes to the profile and skills |
| `GET/PATCH/DELETE /api/profile` | "What Clawd remembers": view, edit or delete each item |
| `GET /api/profile/export` | "My AI profile" as plain text for any assistant |
| `POST /api/session/return` | Return visit: runs the mission check-in (the demo's "one week later" button) |

**Coach tool output** (strict schema, so it's always valid JSON)

```ts
type CoachAction = {
  action: "stay_silent" | "show_tip" | "award_card" | "propose_memory"
        | "suggest_lab" | "assign_mission" | "check_in_mission";
  text?: string;                 // ≤ ~15 words, user's language
  ref?: string;                  // card_id | mission_id | lab mission id
  fact?: string;                 // for propose_memory
  mood: "curious" | "happy" | "thoughtful" | "celebrate";
  point_at?: "upload_button" | "composer" | "answer_notes" | "card_shelf" | "lab_button";
  safety?: boolean;              // bypasses the tip budget
};
```

**User record**

```ts
type User = {
  id: string;                                  // anon cookie
  level: "guide" | "useful" | "off";
  profile: { name?: string; language: "ca"|"es"|"en"; answer_style: "short"|"detailed"|"visual";
             context: "personal"|"work"|"study"; facts: Fact[] };   // ≤ ~20 facts
  skills: { id: string; title: string; instructions: string }[];     // from the Lab
  cards: { id: string; earned_at: string; evidence: string }[];
  missions: { id: string; status: "open"|"done"; assigned_at: string }[];
  tip_history: { at: string; action: string; outcome: "accepted"|"later"|"never" }[];
};
```

**Mascot state machine (frontend):** `coach event + UI signals → state → clip or SVG + position`. The mood comes from the coach and the position from `point_at`. **When** it moves is decided only by the pause gate.

**Stack and deployment**

| Layer | Choice |
|---|---|
| Frontend | Next.js (React) plus the prototype's styles; clips converted to sprite sheets or WebM loops |
| Backend | Next.js API routes on Node, SSE for streaming |
| Claude | Anthropic TypeScript SDK. The task agent uses `messages.stream`; the coach runs through the tool runner with `strict` tools; server-side refusal fallback on both |
| Models | Claude Opus 5 for both agents; the coach can move to Sonnet 5 or Haiku 4.5 (**Open**) |
| Storage | SQLite for the demo, Postgres if hosted |
| Hosting | Vercel (**Open**); the API key stays on the server, never in the browser |
| Backup demo | The current `prototype/index.html` artifact with its offline answers, in case the network fails on stage |

**What reuses the prototype and what's new**

- **Reuse:** the layout, styles, help levels, explainers, Lab flow, before/after compare, and the "Notes for you" format.
- **Replace:** `window.claude.use("sample")` becomes `/api/turn`; `localStorage` becomes the user store.
- **New:** the orchestrator, the coach agent, catalogs, the roaming sprite with anchors, and memory screens.

---

## 3. The mascot: a pet companion

### Personality: an apprentice who learns with you

People don't like being taught, and low confidence is the real barrier. So the mascot isn't a teacher. It's a **curious, slightly clumsy sidekick that learns alongside the user**. "Oh, you can send me a photo? Let's try it!" instead of "Tip: you can upload images."

| Trait | Sounds like | Never |
|---|---|---|
| **Curious** | "Ooh, what's that letter about?" | Nosy about private things |
| **Humble** | "I got that one wrong, want to check it together?" | Acting like it knows best |
| **Warm** | Celebrates *the user's* progress | Guilt ("You missed your streak 😢"). The anti-Duolingo-owl rule. |
| **A bit cheeky** | Light jokes about itself | Jokes about the user's mistakes |
| **Local** | Occasionally "Som-hi!" or a Barcelona reference | Overdoing it, or cultural clichés |

**Voice rules:** about 15 words per bubble at most, questions rather than instructions, no jargon, and it never pretends to be human.

**Name idea:** **Espurna**, Catalan for "spark". It nods to Claude's spark and is local, but it's our own character, which avoids using Anthropic's brand in a public build. **Open**

### Moods

| State | When | What it does |
|---|---|---|
| **Resting** | Default | Stays in its spot and breathes or blinks now and then |
| **Watching** | User is typing | Looks toward the input, nothing more |
| **Busy** | Task agent is working | A small activity (flipping through a tiny book) that makes the wait feel shorter |
| **Curious** | The coach has a tip | A small glow or "!", **no bubble**. Waits for a tap or a natural pause. |
| **Talking** | Tapped, or at a pause | Speech bubble |
| **Celebrating** | A card is earned | A short happy moment, then back to resting |
| **Sleeping** | Idle for a couple of minutes, or in just-do mode | Dozes off; wakes up if poked |

### Rules so it isn't annoying

1. **It only moves at pauses:** never while the user is typing, reading or scrolling.
2. **It never covers content.** It stays on edges and margins; on mobile it has a small dock at the bottom.
3. **It walks to the thing it's talking about.** To suggest a photo, it strolls toward the upload button and points. That's what moving around the screen is for.
4. **The user is in charge:** drag it anywhere (it remembers the spot), put it to sleep, or mute it.
5. **It respects "reduce motion":** with that setting on, it fades between states and doesn't walk.
6. **Few moves:** at most one every so often, with no loops or constant fidgeting.

### Pet touches

- **It reacts to what the user shares:** peeks at the photo, looks thoughtful when a question is about health.
- **It remembers:** greets you by name and asks about last week's mission.
- **Earned cards show on it:** "Check before trusting" gives it tiny reading glasses, "Translate with the right tone" gives it a scarf.
- **No punishment:** happy when you come back, never sad or neglected when you don't.

### How the mascot fits the system

- **Movement and animation are code:** a state machine on the frontend. The LLM never decides where it goes.
- **The coach chooses only words and mood:** `mood` from a fixed list and `point_at` from fixed screen anchors (`upload_button`, `card_shelf`, `answer_sources`, …).
- **The orchestrator decides when:** it owns the tip budget and the "is this a pause?" check.

---

## 4. Prototypes, mockups and design resources

Status on 2026-09-24. Everything below is on `main`.

| Resource | Where | Who | What it is |
|---|---|---|---|
| Meeting note | [`notes/2026-09-24-claude-onboarding-mockup.md`](../notes/2026-09-24-claude-onboarding-mockup.md) ([Granola original](https://notes.granola.ai/d/78865f1d-b82d-434b-b752-5d2b773aa70b)) | Team | The first concept: Clippy-style mascot, gamified 5–10 step tutorial, memory education, skip/later/never |
| Clawd Guide prototype v1 | [`prototype/index.html`](../prototype/index.html) (PR #1) | Janira | Working one-file clickable prototype. Details below. |
| Mascot animation clips | [`animations/`](../animations/) (7 × MP4, 1920 px wide, 2–21 s) | Ridvan | Pixel-art Clawd animation states. Details below. |
| Desk research | [`research/barcelona-ai-users.md`](barcelona-ai-users.md) | Francesc | Who basic chat users in Barcelona are, with 4 personas |

### Clawd Guide prototype v1

A single HTML page styled like the Claude chat interface, with **Clawd** (the pixel-art mascot) in a side panel. Open `prototype/index.html` in a browser; "Reset demo" in the top banner restarts it.

**Demo flow (persona: Carmen López, office admin):**

1. Carmen sends a one-line request: "Translate this to Catalan", followed by a client email about an invoice.
2. Claude answers with a generic translation, tagged **Before**.
3. Clawd nudges: *"You've translated client emails four times this week. Want to teach me how you like them? It takes 2 minutes, and I'll remember next time."* The options are **Open the Lab** / **Not now** / **Don't suggest this again**.
4. **The Lab**, a separate practice conversation ("never touches your real chat"), asks 3 questions: role, tone (formal *vostè*, friendly *tu*, short) and rules that must never go wrong (keep prices and dates, flag anything a client could misread, just the email, keep my signature).
5. **Mission complete:** "From now on, Claude will…", with **Memory updated** and **Skill saved** chips.
6. **Try it on your email:** the same request now gives a polished email tagged **After the Lab**, plus **Notes for you** (for example, *"divendres" could be misread, add the date*).
7. **Compare before and after:** the two answers side by side. This is the demo's strongest moment: same request, only the context changed.

**Other features:**

- **Three help levels:** *Guide me* / *Only when useful* / *Off*, the same idea as the plan's learn vs just-do mode.
- **Explainers:** in *Guide me* mode, UI elements (Projects, model picker, attach, connectors, memory and skill chips) get an orange dot; tapping one shows a one-line plain-language explanation, some with "Try it in the Lab".
- **Backs off by itself:** after 2 dismissals, Clawd offers to switch to *Only when useful*.
- **Lab missions list:** "Teach Claude how you write to clients" (ready), "Tell Claude who you are" and "Connect a tool you use" (marked *Soon*).
- **Responsive:** three columns on desktop, no chat list on tablet, and on phone Clawd becomes a bottom sheet opened from a floating Clawd button with a badge.
- Dark mode, reduced-motion support, and live Claude answers through the artifact runtime, with built-in offline example answers as a fallback.

### Mascot animation clips

Seven short pixel-art clips of Clawd (orange body, black square eyes, four legs) on a light background. The files have auto-generated names, so they're listed by their first characters. *Descriptions come from sample frames and are our interpretation of the intent.*

| Clip | Length | What it shows | Maps to plan mood |
|---|---|---|---|
| `1C8B…` | 2 s | Clawd standing, front view | **Resting** (idle) |
| `294D…` | 5 s | Clawd tilting and wobbling in place | **Busy** or walking |
| `61C1…` | 6 s | Clawd with a blue sweatband and round black props, side and front view; reads as "training" | **Lab / practising** |
| `7FB0…` | 4 s | Clawd in side view with confetti | **Celebrating** (card or save) |
| `88A6…` | 4 s | Happy closed eyes (^ ^), holding a checkered flag | **Mission complete** |
| `9B28…` | 21 s | All the states together on one canvas | Showreel / overview |
| `BE89…` | 11 s | Clawd moving across the screen: left, centre, top right | **Roaming** (moving around the screen) |

### How the prototype and clips fit the plan

**Already matching the plan:**
- A nudge triggered by repetition, with skip, later and never options.
- Help levels that back off automatically.
- Memory saved only after the user takes an action, and shown visibly.
- A before/after comparison that proves the value of a profile.
- A mobile bottom sheet, reduced motion, and dark mode.
- The clips already cover 5 of the plan's moods (resting, busy, lab, celebrating, mission complete) plus roaming.

**Gaps and differences to decide** (added to section 5):

1. **Name and brand.** The prototype uses **Clawd**, Anthropic's own mascot, and a Claude-style interface (with a "Not an Anthropic product" banner). The plan suggested a character of our own (Espurna). Clawd is instantly recognisable to a Claude community audience, but needs Anthropic's OK for anything public beyond the hackathon.
2. **Hero persona.** The prototype's Carmen is an office admin translating client emails, which fits the research persona **Núria**. The plan's Carmen (52, letter from Hisenda) is a different story. The prototype's flow is built and demos well, so either make it the hero story (and rename the persona to Núria) or build the letter story as a second scenario.
3. **What "missions" means.** The prototype's *Lab missions* are practice tasks inside the app. The plan's *missions* are tasks in the real world ("when your next bill arrives…"). Both are useful. Proposal: keep **Lab missions** for in-app setup, and call the real-world ones **Real-life challenges** (name open).
4. **Where the mascot lives.** The prototype keeps Clawd in a side panel or bottom sheet with a gentle bob. The roaming clip and the plan's "walks to what it's talking about" need a small sprite that can leave the panel. Proposal: the panel is where conversation happens, and the sprite is Clawd's ambient presence on the screen.
5. **Cards vs chips.** The prototype shows progress as *Memory updated* / *Skill saved* chips. The plan has a card collection. Chips could be the moment and cards the collection they add to.
6. **Runtime.** The prototype has no backend (it uses the artifact runtime plus offline answers). That's ideal for demo reliability. The plan's Next.js backend is needed for the real orchestrator, coach and user store. Decide whether the hackathon demo stays as an artifact or moves to the backend.
7. **Missing from the clips:** *Watching*, *Curious* (the "!" glow), *Talking* and *Sleeping*.
8. **Clip file names** should be renamed by state (for example `clawd-idle.mp4`, `clawd-celebrate.mp4`) so they're easy to reference in code.

**New ideas from the prototype to adopt in the plan:**
- **Explainers:** orange dots with one-line explanations of the interface.
- **The Lab** as a safe practice space separate from the real chat.
- **"Notes for you"** under answers, flagging what could be misread. This works well with the "check before trusting" lesson.

---

## 5. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Stack | TypeScript + Next.js |
| 2 | Models | Opus 5 for both agents to start |
| 3 | Demo hosting | Hosted, so judges can open it on their phones |
| 4 | Demo language | A Catalan / Spanish / English switcher |
| 5 | More agents planned beyond task and coach? | Decides whether the classifier step is enough or a full LLM router is needed |
| 6 | Mascot character and name | **Clawd** (already designed and animated) for the hackathon; ask Anthropic before any public use beyond it. Espurna as a fallback. |
| 7 | Personality strength | Gentle by default, cheeky in small doses |
| 8 | Hero demo story | The prototype's client-email before/after, with the persona renamed Núria; Carmen's letter as a second scenario if time allows |
| 9 | "Missions" naming | *Lab missions* (in-app) vs *Real-life challenges* (outside) |
| 10 | Mascot placement | Panel for conversation, plus a small roaming sprite |
| 11 | Demo runtime | Keep the artifact version as a safe backup; build the backend version alongside it |

## 6. Next steps

- [ ] Confirm the open decisions above.
- [x] ~~Interactive prototype of the mascot~~: Clawd Guide v1 is done (chat, side panel, Lab, before/after).
- [ ] Rename the animation clips by state, and add the missing states (watching, curious, talking, sleeping).
- [x] ~~Prototype v2 poses~~: the clips are redrawn as pixel-art SVG poses in `prototype/index.html` (idle hop and blink, walk, busy, Lab training, celebrate with confetti, mission-complete flag). Clawd also roams to the coach's `point_at` anchors (upload button, composer, answer, card chip, Lab), stands beside them without covering content, points with its arm, and walks home when the bubble closes.
- [x] ~~Build steps 1–5~~: backend in `web/` (orchestrator, task and coach agents, Lab, memory, challenges) serving the prototype, live on the API.
- [x] ~~Real-life challenges and the return visit~~: start a challenge in the panel, "One week later" in the banner, Clawd checks in and "I did it!" earns the challenge's card. The panel also shows cards and "What Clawd remembers" (forget items, copy the profile).
