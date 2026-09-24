import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config";
import type { User } from "./types";

// One JSON file per user. Good enough for a demo; swap for SQLite/Postgres behind the same functions.

const dir = () => path.resolve(process.cwd(), config.dataDir, "users");
const file = (id: string) => path.join(dir(), `${id}.json`);
const validId = (id: string) => /^[a-zA-Z0-9-]{8,64}$/.test(id);

export const newUserId = () => randomUUID();

export function freshUser(id: string): User {
  return {
    id,
    created_at: new Date().toISOString(),
    level: "guide",
    turn: 0,
    profile: { facts: [] },
    skills: [],
    labs_done: [],
    cards: [],
    missions: [],
    tip_history: [],
    never: [],
    dismissals_in_a_row: 0,
    session: { started_turn: 0, tips: 0 },
    gaps: {},
    pending: {},
    history: [],
  };
}

export async function loadUser(id: string): Promise<User> {
  if (!validId(id)) throw new Error("invalid user id");
  try {
    return { ...freshUser(id), ...JSON.parse(await fs.readFile(file(id), "utf8")) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return freshUser(id);
    throw e;
  }
}

export async function saveUser(user: User): Promise<void> {
  await fs.mkdir(dir(), { recursive: true });
  const tmp = `${file(user.id)}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(user, null, 2));
  await fs.rename(tmp, file(user.id));
}

export async function deleteUser(id: string): Promise<void> {
  if (!validId(id)) return;
  await fs.rm(file(id), { force: true });
}

// Serialise work per user so a mascot tap can't overwrite a turn that is still streaming.
const locks = new Map<string, Promise<unknown>>();

export async function withUser<T>(id: string, fn: (user: User) => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(async () => {
    const user = await loadUser(id);
    const out = await fn(user);
    await saveUser(user);
    return out;
  });
  locks.set(id, run);
  try {
    return await run;
  } finally {
    if (locks.get(id) === run) locks.delete(id);
  }
}
