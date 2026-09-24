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
export const LAB_MISSIONS: LabMission[] = [
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
  {
    id: "you",
    title: "Tell Claude who you are",
    description: "Your role and languages. 1 min",
    ready: true,
    card: "remember_me",
    steps: [
      { key: "context", q: "What do you mostly use it for?", help: "You can change this any time.", multi: false,
        options: ["Personal life", "Work", "Studies"] },
      { key: "language", q: "Which language should I answer in?", help: "I'll use it unless you write in another one.", multi: false,
        options: ["Català", "Español", "English"] },
      { key: "style", q: "How do you like answers?", help: "Pick one.", multi: false,
        options: ["Short", "Detailed", "Visual, with lists"] },
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

export const cardById = (id: string) => CARDS.find((c) => c.id === id);
export const labById = (id: string) => LAB_MISSIONS.find((m) => m.id === id);
export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);
