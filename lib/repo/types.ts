import type {
  Customer,
  CustomerInput,
  Invoice,
  InvoiceEvent,
  InvoiceFull,
  InvoiceItem,
  InvoiceStatus,
  Payment,
  PicInput,
  Profile,
  WebhookEvent,
} from "../types";

export type NewInvoice = Omit<Invoice, "id" | "created_at" | "updated_at">;
export type NewItem = Omit<InvoiceItem, "id" | "invoice_id">;

export interface Repo {
  mode: "local" | "supabase";

  signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>;
  signOut(): Promise<void>;
  currentProfile(): Promise<Profile | null>;
  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, patch: Partial<Pick<Profile, "full_name">>): Promise<void>;

  listCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  insertCustomer(input: CustomerInput, pics: PicInput[], actorId: string): Promise<Customer>;
  updateCustomer(id: string, input: CustomerInput, pics: PicInput[]): Promise<void>;

  listInvoices(): Promise<Invoice[]>;
  /** Semua invoice dalam satu grup DP, urut DP → Pelunasan. */
  listGroup(groupId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<InvoiceFull | null>;
  insertInvoice(inv: NewInvoice, items: NewItem[]): Promise<Invoice>;
  /**
   * Update atomik bersyarat: hanya berhasil jika status saat ini ada di `expect`.
   * Mengembalikan null jika status sudah berubah (dipakai untuk mencegah approval ganda).
   */
  updateInvoice(
    id: string,
    patch: Partial<NewInvoice>,
    opts?: { expect?: InvoiceStatus[]; items?: NewItem[] },
  ): Promise<Invoice | null>;
  /** Hapus permanen (item, riwayat & webhook ikut terhapus). Hanya jika status ada di `expect`. */
  deleteInvoice(id: string, expect: InvoiceStatus[]): Promise<boolean>;
  insertEvent(e: Omit<InvoiceEvent, "id" | "created_at">): Promise<void>;

  /** Simpan file bukti transfer ke storage privat, lalu catat pembayarannya. */
  insertPayment(p: Omit<Payment, "id" | "created_at">, file: Uint8Array): Promise<Payment>;
  getPayment(id: string): Promise<Payment | null>;
  /** Isi file bukti transfer (hanya dibaca server, setelah cek login). */
  readProof(path: string): Promise<Uint8Array | null>;

  /** Counter atomik (aman untuk request bersamaan). */
  nextSequence(key: string): Promise<number>;
  /** Ambil n nomor berurutan sekaligus; mengembalikan nomor pertama. */
  nextSequenceBlock(key: string, n: number): Promise<number>;

  insertWebhook(w: Omit<WebhookEvent, "created_at">): Promise<void>;
  updateWebhook(id: string, patch: Partial<WebhookEvent>): Promise<void>;
  getWebhook(id: string): Promise<WebhookEvent | null>;

  /** Idempotensi callback dari n8n. false jika event_id sudah pernah diproses. */
  claimInboundEvent(eventId: string, eventType: string): Promise<boolean>;
  /** Lepas klaim jika pemrosesan gagal, agar retry dengan event_id yang sama tetap diproses. */
  releaseInboundEvent(eventId: string): Promise<void>;

  /** Pengaturan bersama (mis. default remarks). */
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}
