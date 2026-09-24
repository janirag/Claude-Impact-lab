// Fixed catalogs: Claude decides *when* to use them, never invents new ones.

export type Card = { id: string; title: string; lesson: string; accessory?: string };

export const CARDS: Card[] = [
  { id: "give_context", title: "Give context", lesson: "Say who it's for and why, and the answer fits much better.", accessory: "notepad" },
  { id: "show_a_photo", title: "Show a photo", lesson: "Send a picture of a letter or document instead of typing it out.", accessory: "camera" },
  { id: "ask_for_sources", title: "Ask for sources", lesson: "Ask where an answer comes from, then open the link.", accessory: "magnifier" },
  { id: "check_before_trusting", title: "Check before trusting", lesson: "For health, legal or money questions, double-check before acting.", accessory: "reading_glasses" },
  { id: "remember_me", title: "Remember me", lesson: "Let the assistant remember your preferences so you don't repeat them.", accessory: "heart" },
  { id: "set_my_style", title: "Set my style", lesson: "Tell it how you like answers: short, detailed or visual.", accessory: "bow" },
  { id: "translate_with_tone", title: "Translate with the right tone", lesson: "Say how formal a translation should be (vostè or tu).", accessory: "scarf" },
  { id: "dont_share_secrets", title: "Don't share secrets", lesson: "Leave out ID numbers, passwords and private client data.", accessory: "shield" },
];

export type LabStep = { key: string; q: string; help: string; multi: boolean; options: string[] };
export type LabMission = {
  id: string;
  title: string;
  description: string;
  ready: boolean;
  card?: string; // card earned when completed
  steps: LabStep[];
};

// Mirrors prototype/index.html so the frontend can reuse its Lab flow.
// Their guide for Claude comes first: it's the plain-words CLAUDE.md that every answer reads.
export const LAB_MISSIONS: LabMission[] = [
  {
    id: "you",
    title: "Write your guide for Claude",
    description: "What you need help with and how you like answers. 1 min",
    ready: true,
    card: "remember_me",
    steps: [
      { key: "helps", q: "What would you like Claude to help you with?", help: "Pick as many as you like.", multi: true,
        options: ["Letters and paperwork", "Health questions", "Money, bills and taxes", "Home and rent", "Writing messages and emails"] },
      { key: "style", q: "How do you like answers?", help: "Pick one.", multi: false,
        options: ["Short and simple", "Step by step", "With all the details"] },
      { key: "always", q: "What should Claude always do for you?", help: "Pick as many as you like.", multi: true,
        options: ["Tell me what to double-check and who to ask", "Use plain words, no jargon", "Keep dates and amounts exactly as written", "Remind me not to share ID or bank numbers"] },
      { key: "language", q: "Which language should I answer in?", help: "I'll use it unless you write in another one.", multi: false,
        options: ["Català", "Español", "English"] },
    ],
  },
  {
    id: "clients",
    title: "Teach Claude how you write to clients",
    description: "Saves your tone and rules. 2 min",
    ready: true,
    card: "set_my_style",
    steps: [
      { key: "role", q: "Who are you when you write to clients?", help: "Pick the closest one.", multi: false,
        options: ["Office admin", "Accounts", "Sales", "Reception"] },
      { key: "tone", q: "How should your emails sound?", help: "Claude will write every client email this way.", multi: false,
        options: ["Warm and formal (vostè)", "Friendly (tu)", "Short and direct"] },
      { key: "rules", q: "What must never go wrong?", help: "Pick as many as you like.", multi: true,
        options: ["Keep prices and dates exactly as I wrote them", "Flag anything a client could misread", "Only give me the email, ready to paste", "Keep my signature"] },
    ],
  },
  { id: "connect", title: "Connect a tool you use", description: "Claude reads your calendar. 3 min", ready: false, steps: [] },
];

// Real-life challenges: small tasks to try outside the app, checked on the next visit.
export type Challenge = { id: string; title: string; prompt: string; card: string };

export const CHALLENGES: Challenge[] = [
  { id: "next_bill", title: "Check your next bill", prompt: "When your next bill arrives, take a photo and ask what's unusual.", card: "show_a_photo" },
  { id: "ask_sources", title: "Ask for the source", prompt: "Next time you ask a health or money question, ask where the answer comes from.", card: "ask_for_sources" },
  { id: "show_a_friend", title: "Show a friend", prompt: "Show someone close to you one trick you learned here.", card: "give_context" },
];

// Situations on the home screen: real-life starting points instead of lessons. `guide` is the task agent's first step.
export type Situation = { id: string; title: string; wants_file: boolean; guide: string };

export const SITUATIONS: Situation[] = [
  { id: "letter", title: "A letter I don't understand", wants_file: true,
    guide: "Say who sent it and what it is about in one plain sentence. Then give any amounts and deadlines exactly as written, and the one concrete next step. If no letter was attached or pasted, kindly ask for a photo of it and say nothing else." },
  { id: "bill", title: "Check a bill", wants_file: true,
    guide: "Say what the bill is for, the total and the due date. Point out anything unusual (a charge that looks new, higher than normal, or duplicated) and what to do if it looks wrong. If no bill was attached or pasted, kindly ask for a photo of it and say nothing else." },
  { id: "rent", title: "A rental contract", wants_file: true,
    guide: "Summarise the key terms: length, monthly rent, deposit (fianza), who pays what, and how to leave early. Flag anything unusual for a rental in Catalonia and suggest the local Oficina d'Habitatge to double-check. If no contract was attached or pasted, kindly ask for a photo or PDF of it and say nothing else." },
  { id: "doctor", title: "Prepare for the doctor", wants_file: false,
    guide: "Help them prepare, not diagnose. If they haven't said much yet, ask at most 3 short questions (what is happening, since when, what they already tried). Then give a short list to take to the appointment: what to tell the doctor and what to ask." },
  { id: "trip", title: "Plan a trip", wants_file: false,
    guide: "If where, when or budget is missing, ask for just those in one short question. Otherwise give a simple day-by-day plan with rough costs, and say which details (prices, timetables) to check before booking." },
  { id: "homework", title: "Help with homework", wants_file: true,
    guide: "The user is usually a parent helping a child. Explain the topic simply so they can help, with one worked example, rather than just giving the answers. If the exercise isn't attached or pasted, ask for a photo of it or the child's school year and subject." },
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id);
export const labById = (id: string) => LAB_MISSIONS.find((m) => m.id === id);
export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);
export const situationById = (id: string) => SITUATIONS.find((s) => s.id === id);
