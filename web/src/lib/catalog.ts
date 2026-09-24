import type { Language } from "./types";

// Fixed catalogs: Claude decides *when* to use them, never invents new ones.
// English lives in the base fields (the agents' prompts read it); `tr` holds the Spanish and Catalan text shown
// on screen. Ids never change between languages.

type Tr<T> = Partial<Record<Exclude<Language, "en">, T>>;

export type Card = { id: string; title: string; lesson: string; accessory?: string; tr?: Tr<{ title: string; lesson: string }> };

export const CARDS: Card[] = [
  { id: "give_context", title: "Give context", lesson: "Say who it's for and why, and the answer fits much better.", accessory: "notepad",
    tr: { es: { title: "Da contexto", lesson: "Di para quién es y por qué, y la respuesta encajará mucho mejor." },
          ca: { title: "Dona context", lesson: "Digues per a qui és i per què, i la resposta encaixarà molt millor." } } },
  { id: "show_a_photo", title: "Show a photo", lesson: "Send a picture of a letter or document instead of typing it out.", accessory: "camera",
    tr: { es: { title: "Enseña una foto", lesson: "Envía una foto de la carta o el documento en vez de copiarlo a mano." },
          ca: { title: "Ensenya una foto", lesson: "Envia una foto de la carta o el document en lloc de copiar-lo a mà." } } },
  { id: "ask_for_sources", title: "Ask for sources", lesson: "Ask where an answer comes from, then open the link.", accessory: "magnifier",
    tr: { es: { title: "Pide las fuentes", lesson: "Pregunta de dónde sale una respuesta y abre el enlace." },
          ca: { title: "Demana les fonts", lesson: "Pregunta d'on surt una resposta i obre l'enllaç." } } },
  { id: "check_before_trusting", title: "Check before trusting", lesson: "For health, legal or money questions, double-check before acting.", accessory: "reading_glasses",
    tr: { es: { title: "Comprueba antes de fiarte", lesson: "En temas de salud, legales o de dinero, compruébalo antes de actuar." },
          ca: { title: "Comprova abans de refiar-te'n", lesson: "En temes de salut, legals o de diners, comprova-ho abans d'actuar." } } },
  { id: "remember_me", title: "Remember me", lesson: "Let the assistant remember your preferences so you don't repeat them.", accessory: "heart",
    tr: { es: { title: "Recuérdame", lesson: "Deja que el asistente recuerde tus preferencias para no tener que repetirlas." },
          ca: { title: "Recorda'm", lesson: "Deixa que l'assistent recordi les teves preferències i no les hauràs de repetir." } } },
  { id: "set_my_style", title: "Set my style", lesson: "Tell it how you like answers: short, detailed or visual.", accessory: "bow",
    tr: { es: { title: "Mi estilo", lesson: "Dile cómo te gustan las respuestas: cortas, detalladas o visuales." },
          ca: { title: "El meu estil", lesson: "Digues-li com t'agraden les respostes: curtes, detallades o visuals." } } },
  { id: "translate_with_tone", title: "Translate with the right tone", lesson: "Say how formal a translation should be (vostè or tu).", accessory: "scarf",
    tr: { es: { title: "Traduce con el tono adecuado", lesson: "Di cuánta formalidad quieres en una traducción (vostè o tu)." },
          ca: { title: "Tradueix amb el to adequat", lesson: "Digues com de formal ha de ser una traducció (vostè o tu)." } } },
  { id: "dont_share_secrets", title: "Don't share secrets", lesson: "Leave out ID numbers, passwords and private client data.", accessory: "shield",
    tr: { es: { title: "No compartas secretos", lesson: "No incluyas números de DNI, contraseñas ni datos privados de clientes." },
          ca: { title: "No comparteixis secrets", lesson: "No hi posis números de DNI, contrasenyes ni dades privades de clients." } } },
];

// `options` are the values the API accepts in every language; `tr` only changes the labels shown for them (same order).
export type LabStep = { key: string; q: string; help: string; multi: boolean; options: string[] };
type LabStepText = { q: string; help: string; options: string[] };
export type LabMission = {
  id: string;
  title: string;
  description: string;
  ready: boolean;
  card?: string; // card earned when completed
  steps: LabStep[];
  tr?: Tr<{ title: string; description: string; steps?: Record<string, LabStepText> }>;
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
    tr: {
      es: { title: "Enseña a Claude cómo escribes a tus clientes", description: "Guarda tu tono y tus normas. 2 min", steps: {
        role: { q: "¿Quién eres cuando escribes a clientes?", help: "Elige la opción más parecida.",
          options: ["Administración", "Contabilidad", "Ventas", "Recepción"] },
        tone: { q: "¿Cómo deben sonar tus correos?", help: "Claude escribirá así todos los correos a clientes.",
          options: ["Cordial y formal (vostè)", "Cercano (tu)", "Breve y directo"] },
        rules: { q: "¿Qué no puede fallar nunca?", help: "Elige todas las que quieras.",
          options: ["Mantener precios y fechas tal como los escribí", "Avisar de todo lo que un cliente pueda malinterpretar", "Darme solo el correo, listo para pegar", "Mantener mi firma"] },
      } },
      ca: { title: "Ensenya a Claude com escrius als clients", description: "Desa el teu to i les teves normes. 2 min", steps: {
        role: { q: "Qui ets quan escrius als clients?", help: "Tria l'opció més semblant.",
          options: ["Administració", "Comptabilitat", "Vendes", "Recepció"] },
        tone: { q: "Com han de sonar els teus correus?", help: "Claude escriurà així tots els correus als clients.",
          options: ["Cordial i formal (vostè)", "Proper (tu)", "Breu i directe"] },
        rules: { q: "Què no pot fallar mai?", help: "Tria'n tantes com vulguis.",
          options: ["Mantenir preus i dates tal com els he escrit", "Avisar de tot el que un client pugui entendre malament", "Donar-me només el correu, a punt per enganxar", "Mantenir la meva signatura"] },
      } },
    },
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
    tr: {
      es: { title: "Cuéntale a Claude quién eres", description: "Para qué lo usas, tu idioma y tu estilo. 1 min", steps: {
        context: { q: "¿Para qué lo usas sobre todo?", help: "Puedes cambiarlo cuando quieras.", options: ["Vida personal", "Trabajo", "Estudios"] },
        language: { q: "¿En qué idioma te respondo?", help: "Lo usaré salvo que escribas en otro.", options: ["Català", "Español", "English"] },
        style: { q: "¿Cómo te gustan las respuestas?", help: "Elige una.", options: ["Cortas", "Detalladas", "Visuales, con listas"] },
      } },
      ca: { title: "Explica a Claude qui ets", description: "Per a què el fas servir, la teva llengua i el teu estil. 1 min", steps: {
        context: { q: "Per a què el fas servir sobretot?", help: "Ho pots canviar quan vulguis.", options: ["Vida personal", "Feina", "Estudis"] },
        language: { q: "En quina llengua et responc?", help: "La faré servir tret que escriguis en una altra.", options: ["Català", "Español", "English"] },
        style: { q: "Com t'agraden les respostes?", help: "Tria'n una.", options: ["Curtes", "Detallades", "Visuals, amb llistes"] },
      } },
    },
  },
  { id: "connect", title: "Connect a tool you use", description: "Claude reads your calendar. 3 min", ready: false, steps: [],
    tr: { es: { title: "Conecta una herramienta que uses", description: "Claude lee tu calendario. 3 min" },
          ca: { title: "Connecta una eina que facis servir", description: "Claude llegeix el teu calendari. 3 min" } } },
];

// Real-life challenges: small tasks to try outside the app, checked on the next visit.
export type Challenge = { id: string; title: string; prompt: string; card: string; tr?: Tr<{ title: string; prompt: string }> };

export const CHALLENGES: Challenge[] = [
  { id: "next_bill", title: "Check your next bill", prompt: "When your next bill arrives, take a photo and ask what's unusual.", card: "show_a_photo",
    tr: { es: { title: "Revisa tu próxima factura", prompt: "Cuando te llegue la próxima factura, hazle una foto y pregunta si hay algo raro." },
          ca: { title: "Revisa la propera factura", prompt: "Quan t'arribi la propera factura, fes-li una foto i pregunta si hi ha res d'estrany." } } },
  { id: "ask_sources", title: "Ask for the source", prompt: "Next time you ask a health or money question, ask where the answer comes from.", card: "ask_for_sources",
    tr: { es: { title: "Pide la fuente", prompt: "La próxima vez que preguntes algo de salud o de dinero, pregunta de dónde sale la respuesta." },
          ca: { title: "Demana la font", prompt: "La propera vegada que preguntis alguna cosa de salut o de diners, pregunta d'on surt la resposta." } } },
  { id: "show_a_friend", title: "Show a friend", prompt: "Show someone close to you one trick you learned here.", card: "give_context",
    tr: { es: { title: "Enséñaselo a alguien", prompt: "Enseña a alguien cercano un truco que hayas aprendido aquí." },
          ca: { title: "Ensenya-ho a algú", prompt: "Ensenya a algú proper un truc que hagis après aquí." } } },
];

// Situations on the home screen: real-life starting points instead of lessons. `guide` is the task agent's first step
// (an instruction for the model, so it stays in English).
export type Situation = { id: string; title: string; wants_file: boolean; guide: string; tr?: Tr<{ title: string }> };

export const SITUATIONS: Situation[] = [
  { id: "letter", title: "A letter I don't understand", wants_file: true,
    guide: "Say who sent it and what it is about in one plain sentence. Then give any amounts and deadlines exactly as written, and the one concrete next step. If no letter was attached or pasted, kindly ask for a photo of it and say nothing else.",
    tr: { es: { title: "Una carta que no entiendo" }, ca: { title: "Una carta que no entenc" } } },
  { id: "bill", title: "Check a bill", wants_file: true,
    guide: "Say what the bill is for, the total and the due date. Point out anything unusual (a charge that looks new, higher than normal, or duplicated) and what to do if it looks wrong. If no bill was attached or pasted, kindly ask for a photo of it and say nothing else.",
    tr: { es: { title: "Revisar una factura" }, ca: { title: "Revisar una factura" } } },
  { id: "rent", title: "A rental contract", wants_file: true,
    guide: "Summarise the key terms: length, monthly rent, deposit (fianza), who pays what, and how to leave early. Flag anything unusual for a rental in Catalonia and suggest the local Oficina d'Habitatge to double-check. If no contract was attached or pasted, kindly ask for a photo or PDF of it and say nothing else.",
    tr: { es: { title: "Un contrato de alquiler" }, ca: { title: "Un contracte de lloguer" } } },
  { id: "doctor", title: "Prepare for the doctor", wants_file: false,
    guide: "Help them prepare, not diagnose. If they haven't said much yet, ask at most 3 short questions (what is happening, since when, what they already tried). Then give a short list to take to the appointment: what to tell the doctor and what to ask.",
    tr: { es: { title: "Preparar la visita al médico" }, ca: { title: "Preparar la visita al metge" } } },
  { id: "trip", title: "Plan a trip", wants_file: false,
    guide: "If where, when or budget is missing, ask for just those in one short question. Otherwise give a simple day-by-day plan with rough costs, and say which details (prices, timetables) to check before booking.",
    tr: { es: { title: "Planear un viaje" }, ca: { title: "Planificar un viatge" } } },
  { id: "homework", title: "Help with homework", wants_file: true,
    guide: "The user is usually a parent helping a child. Explain the topic simply so they can help, with one worked example, rather than just giving the answers. If the exercise isn't attached or pasted, ask for a photo of it or the child's school year and subject.",
    tr: { es: { title: "Ayuda con los deberes" }, ca: { title: "Ajuda amb els deures" } } },
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id);
export const labById = (id: string) => LAB_MISSIONS.find((m) => m.id === id);
export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);
export const situationById = (id: string) => SITUATIONS.find((s) => s.id === id);

// A card, challenge or situation as shown in `lang`: the same fields, with `tr` applied and dropped.
export function inLanguage<T extends { tr?: Tr<object> }>(item: T, lang: Language): Omit<T, "tr"> {
  const { tr, ...base } = item;
  return { ...base, ...(lang === "en" ? {} : tr?.[lang]) };
}

// A Lab mission as shown in `lang`. Each step keeps its English `options` (what the API accepts) and adds `labels`.
export function labInLanguage(m: LabMission, lang: Language) {
  const { tr, ...base } = m;
  const text = lang === "en" ? undefined : tr?.[lang];
  return {
    ...base,
    title: text?.title ?? m.title,
    description: text?.description ?? m.description,
    steps: m.steps.map((s) => {
      const st = text?.steps?.[s.key];
      return { ...s, q: st?.q ?? s.q, help: st?.help ?? s.help, labels: st?.options ?? s.options };
    }),
  };
}
