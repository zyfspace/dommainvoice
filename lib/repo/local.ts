import "server-only";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import type { Customer, Invoice, InvoiceEvent, InvoiceItem, Payment, Pic, Profile, Role, WebhookEvent } from "../types";
import type { Repo } from "./types";

/**
 * Mode LOKAL — untuk testing tanpa Supabase. Data disimpan di .data/db.json.
 * Akun & role identik dengan seed Supabase (supabase/seed.sql).
 */

/** `role = null` → akun baru yang belum menyelesaikan onboarding. */
interface LocalUser extends Omit<Profile, "role"> {
  role: Role | null;
  password_hash: string;
}

type StaffUser = LocalUser & { role: Role };
const isStaff = (u: LocalUser | undefined): u is StaffUser => Boolean(u?.role);

interface Db {
  users: LocalUser[];
  customers: Omit<Customer, "pics">[];
  pics: Pic[];
  invoices: Invoice[];
  items: InvoiceItem[];
  events: InvoiceEvent[];
  sequences: Record<string, number>;
  webhooks: WebhookEvent[];
  inbound: Record<string, { event_type: string; received_at: string }>;
  settings?: Record<string, string>;
  payments?: Payment[];
}

const FILE = path.join(process.cwd(), ".data", "db.json");
const UPLOADS = path.join(process.cwd(), ".data", "uploads");
const COOKIE = "domma_session";
const SESSION_DAYS = 7;

const SEED_USERS: { email: string; password: string; role: Role; full_name: string }[] = [
  { email: "admin@withdomma.com", password: "admindomma!", role: "admin", full_name: "Admin Domma" },
  { email: "finance@withdomma.com", password: "financedomma!", role: "finance", full_name: "Finance Domma" },
];

function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function verify(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const a = Buffer.from(key, "hex");
  const b = scryptSync(password, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

function secret() {
  return process.env.LOCAL_SESSION_SECRET || "domma-local-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

const now = () => new Date().toISOString();

// Disimpan di globalThis: Next memuat modul ini terpisah untuk route handler & server action,
// jadi state harus dibagi per proses, bukan per instance modul.
const g = globalThis as unknown as { __dommaDb?: Db; __dommaQueue?: Promise<unknown> };

async function load(): Promise<Db> {
  if (g.__dommaDb) return g.__dommaDb;
  try {
    g.__dommaDb = JSON.parse(await readFile(FILE, "utf8")) as Db;
  } catch {
    g.__dommaDb = {
      users: SEED_USERS.map((u) => ({
        id: randomUUID(),
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        password_hash: hash(u.password),
      })),
      customers: [],
      pics: [],
      invoices: [],
      items: [],
      events: [],
      sequences: {},
      webhooks: [],
      inbound: {},
    };
    await persist(g.__dommaDb);
  }
  return g.__dommaDb;
}

async function persist(db: Db) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, FILE);
}

/** Serialisasi semua penulisan agar counter & update bersyarat tetap atomik di satu proses. */
function tx<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = (g.__dommaQueue ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  g.__dommaQueue = run.catch(() => undefined);
  return run;
}

const read = async <T>(fn: (db: Db) => T) => fn(await load());

function toProfile(u: StaffUser): Profile {
  const { password_hash: _, ...p } = u;
  return p;
}

async function startSession(id: string) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const payload = `${id}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

async function sessionUser() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return undefined;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig || sign(`${id}.${exp}`) !== sig || Number(exp) < Date.now()) return undefined;
  return read((db) => db.users.find((u) => u.id === id));
}

function withPics(db: Db, c: Omit<Customer, "pics">): Customer {
  return { ...c, pics: db.pics.filter((p) => p.customer_id === c.id) };
}

export const localRepo: Repo = {
  mode: "local",

  async signIn(email, password) {
    const user = await read((db) => db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()));
    if (!user || !verify(password, user.password_hash)) return { ok: false, error: "Email atau password salah." };
    await startSession(user.id);
    return { ok: true };
  },

  async signUp(email, password) {
    const id = await tx((db) => {
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return null;
      const user: LocalUser = { id: randomUUID(), email, full_name: null, role: null, password_hash: hash(password) };
      db.users.push(user);
      return user.id;
    });
    if (!id) return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
    await startSession(id);
    return { ok: true };
  },

  async signOut() {
    (await cookies()).delete(COOKIE);
  },

  async currentUser() {
    const user = await sessionUser();
    return user ? { id: user.id, email: user.email } : null;
  },

  async currentProfile() {
    const user = await sessionUser();
    return isStaff(user) ? toProfile(user) : null;
  },

  createProfile: (profile) =>
    tx((db) => {
      const u = db.users.find((x) => x.id === profile.id);
      if (!u) throw new Error("User tidak ditemukan.");
      Object.assign(u, { full_name: profile.full_name, role: profile.role });
    }),

  listProfiles: () => read((db) => db.users.filter(isStaff).map(toProfile)),

  updateProfile: (id, patch) =>
    tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (u) Object.assign(u, patch);
    }),

  listCustomers: () =>
    read((db) =>
      db.customers
        .map((c) => withPics(db, c))
        .sort((a, b) => a.company_name.localeCompare(b.company_name)),
    ),

  getCustomer: (id) =>
    read((db) => {
      const c = db.customers.find((x) => x.id === id);
      return c ? withPics(db, c) : null;
    }),

  insertCustomer: (input, pics, actorId) =>
    tx((db) => {
      const c = { ...input, id: randomUUID(), created_by: actorId, created_at: now(), updated_at: now() };
      db.customers.push(c);
      for (const p of pics) db.pics.push({ ...p, id: randomUUID(), customer_id: c.id });
      return withPics(db, c);
    }),

  updateCustomer: (id, input, pics) =>
    tx((db) => {
      const c = db.customers.find((x) => x.id === id);
      if (!c) return;
      Object.assign(c, input, { updated_at: now() });
      const keep = new Set(pics.filter((p) => p.id).map((p) => p.id));
      db.pics = db.pics.filter((p) => p.customer_id !== id || keep.has(p.id));
      for (const p of pics) {
        const existing = p.id && db.pics.find((x) => x.id === p.id);
        if (existing) Object.assign(existing, { name: p.name, email: p.email, phone: p.phone, position: p.position });
        else db.pics.push({ ...p, id: randomUUID(), customer_id: id });
      }
    }),

  countInvoices: (status) => read((db) => db.invoices.filter((i) => i.status === status).length),
  listInvoices: () => read((db) => [...db.invoices].sort((a, b) => b.created_at.localeCompare(a.created_at))),

  listGroup: (groupId) =>
    read((db) => db.invoices.filter((x) => x.group_id === groupId).sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0))),

  getInvoice: (id) =>
    read((db) => {
      const inv = db.invoices.find((x) => x.id === id);
      if (!inv) return null;
      return {
        ...inv,
        items: db.items.filter((i) => i.invoice_id === id).sort((a, b) => a.position - b.position),
        events: db.events.filter((e) => e.invoice_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at)),
        webhooks: db.webhooks.filter((w) => w.invoice_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
        payments: (db.payments ?? []).filter((p) => p.invoice_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at)),
      };
    }),

  insertInvoice: (data, items) =>
    tx((db) => {
      const inv: Invoice = { ...data, id: randomUUID(), created_at: now(), updated_at: now() };
      db.invoices.push(inv);
      for (const it of items) db.items.push({ ...it, id: randomUUID(), invoice_id: inv.id });
      return inv;
    }),

  updateInvoice: (id, patch, opts = {}) =>
    tx((db) => {
      const inv = db.invoices.find((x) => x.id === id);
      if (!inv || (opts.expect && !opts.expect.includes(inv.status))) return null;
      if (patch.invoice_number && db.invoices.some((x) => x.id !== id && x.invoice_number === patch.invoice_number))
        throw new Error("Nomor invoice duplikat.");
      Object.assign(inv, patch, { updated_at: now() });
      if (opts.items) {
        db.items = db.items.filter((i) => i.invoice_id !== id);
        for (const it of opts.items) db.items.push({ ...it, id: randomUUID(), invoice_id: id });
      }
      return { ...inv };
    }),

  deleteInvoice: (id, expect) =>
    tx((db) => {
      const inv = db.invoices.find((x) => x.id === id);
      if (!inv || !expect.includes(inv.status)) return false;
      db.invoices = db.invoices.filter((x) => x.id !== id);
      db.items = db.items.filter((i) => i.invoice_id !== id);
      db.events = db.events.filter((e) => e.invoice_id !== id);
      db.webhooks = db.webhooks.filter((w) => w.invoice_id !== id);
      db.payments = (db.payments ?? []).filter((p) => p.invoice_id !== id);
      return true;
    }),

  claimPrint: (id, data, expect) =>
    tx((db) => {
      const inv = db.invoices.find((x) => x.id === id);
      if (!inv || !expect.includes(inv.status) || inv.printed_at) return null;
      Object.assign(inv, data);
      return { ...inv };
    }),

  insertEvent: (e) =>
    tx((db) => {
      db.events.push({ ...e, id: randomUUID(), created_at: now() });
    }),

  insertPayment: (p, file) =>
    tx(async (db) => {
      const target = path.join(UPLOADS, p.proof_path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file);
      const row: Payment = { ...p, id: randomUUID(), created_at: now() };
      (db.payments ??= []).push(row);
      return row;
    }),

  getPayment: (id) => read((db) => (db.payments ?? []).find((p) => p.id === id) ?? null),

  readProof: async (p) => {
    try {
      return new Uint8Array(await readFile(path.join(UPLOADS, p)));
    } catch {
      return null;
    }
  },

  nextSequence: (key) =>
    tx((db) => {
      db.sequences[key] = (db.sequences[key] ?? 0) + 1;
      return db.sequences[key];
    }),

  nextSequenceBlock: (key, n) =>
    tx((db) => {
      const first = (db.sequences[key] ?? 0) + 1;
      db.sequences[key] = first + n - 1;
      return first;
    }),

  insertWebhook: (w) =>
    tx((db) => {
      db.webhooks.push({ ...w, created_at: now() });
    }),

  updateWebhook: (id, patch) =>
    tx((db) => {
      const w = db.webhooks.find((x) => x.id === id);
      if (w) Object.assign(w, patch);
    }),

  getWebhook: (id) => read((db) => db.webhooks.find((x) => x.id === id) ?? null),

  claimInboundEvent: (eventId, eventType) =>
    tx((db) => {
      if (db.inbound[eventId]) return false;
      db.inbound[eventId] = { event_type: eventType, received_at: now() };
      return true;
    }),

  releaseInboundEvent: (eventId) =>
    tx((db) => {
      delete db.inbound[eventId];
    }),

  getSetting: async (key) => (await load()).settings?.[key] ?? null,

  setSetting: (key, value) =>
    tx((db) => {
      (db.settings ??= {})[key] = value;
    }),
};
