# MVP plan: AI coach with a pet mascot

*Working plan, September 2026. Claude Impact Lab. Still in the design phase: items marked **Open** are not decided yet.*

**Builds on:** [basic chat AI users in Barcelona](barcelona-ai-users.md) and the [onboarding mockup meeting note](../notes/2026-09-24-claude-onboarding-mockup.md).

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

## 4. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Stack | TypeScript + Next.js |
| 2 | Models | Opus 5 for both agents to start |
| 3 | Demo hosting | Hosted, so judges can open it on their phones |
| 4 | Demo language | A Catalan / Spanish / English switcher |
| 5 | More agents planned beyond task and coach? | Decides whether the classifier step is enough or a full LLM router is needed |
| 6 | Mascot look | A spark or blob shape, easy to animate |
| 7 | Personality strength | Gentle by default, cheeky in small doses |
| 8 | Mascot name | Espurna, or choose one as a team |

## 5. Next steps

- [ ] Confirm the open decisions above.
- [ ] Interactive prototype of the mascot's moods and movement rules, to test the feel before the visual design.
- [ ] Build step 1: Next.js project with the task agent and an empty mascot slot for the design.
