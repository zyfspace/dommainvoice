import type { Customization, Invoice, InvoiceStatus, ItemInput, PaymentType, Role } from "./types";

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  on_check: "On Check",
  revision_requested: "Revision Requested",
  rejected: "Rejected",
  approved: "Approved",
  issued: "Issued",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const STATUS_ORDER: InvoiceStatus[] = [
  "draft",
  "on_check",
  "revision_requested",
  "approved",
  "issued",
  "paid",
  "rejected",
  "cancelled",
];

export const CUSTOMIZATION_LABEL: Record<Customization, string> = {
  engrave: "Engrave",
  uv_print: "UV Print",
  plain: "Plain",
};

// Placeholder — menunggu konfirmasi jenis payment type & aturan penomoran dari Domma (TRD §10 poin 4).
export const PAYMENT_TYPES: Record<PaymentType, { label: string; code: string }> = {
  cbd: { label: "Cash Before Delivery", code: "CBD" },
  dp: { label: "Down Payment", code: "DP" },
  termin: { label: "Termin", code: "TRM" },
  top: { label: "Term of Payment", code: "TOP" },
};

export const DEFAULT_TAX_RATE = 11;

/**
 * Satu counter untuk semua payment type, berjalan terus (tidak reset per tahun).
 * Melanjutkan nomor lama client: set value di tabel sequences ke nomor terakhir mereka.
 */
export const SEQUENCE_KEY = "invoice:DOM";

/** MM/YYYY-INV/DOM/NNN, mis. 09/2026-INV/DOM/707. */
export function formatInvoiceNumber(date: string, seq: number) {
  return `${date.slice(5, 7)}/${date.slice(0, 4)}-INV/DOM/${String(seq).padStart(3, "0")}`;
}

export const EDITABLE: InvoiceStatus[] = ["draft", "revision_requested"];
/** Invoice yang sudah Approved/Issued harus dibatalkan dulu (jejak audit), baru bisa dihapus. */
export const DELETABLE: InvoiceStatus[] = ["draft", "revision_requested", "rejected", "on_check", "cancelled"];
export const CANCELLABLE: InvoiceStatus[] = ["on_check", "approved", "issued"];
/** Bukti transfer bisa diupload setelah invoice disetujui/terbit. DP & pelunasan = invoice terpisah. */
export const PAYABLE: InvoiceStatus[] = ["approved", "issued"];
/** Status yang boleh dicetak (sudah di-approve Finance). Cetaknya dicatat. */
export const PRINTABLE: InvoiceStatus[] = ["approved", "issued", "paid"];

/**
 * Nilai satu invoice untuk daftar & rekap: grup DP memakai nominal bagiannya (DP / Pelunasan)
 * supaya total grup tidak terhitung dua kali; invoice tunggal memakai total.
 */
export function invoiceAmount(inv: { total: number; payable_percent: number | null; group_id: string | null }) {
  return inv.group_id ? invoiceDue(inv) : inv.total;
}

/** Nominal yang ditagih invoice: baris DP/termin bila ada, selain itu total. */
export function invoiceDue(inv: { total: number; payable_percent: number | null }) {
  return inv.payable_percent ? Math.round((inv.total * inv.payable_percent) / 100) : inv.total;
}
/** Role yang boleh upload bukti transfer. */
export const PAYMENT_ROLES: Role[] = ["admin", "finance"];
/** Role yang boleh mencetak Surat Jalan (invoice harus Paid). Sementara Admin & Finance. */
export const SURAT_JALAN_ROLES: Role[] = ["admin", "finance"];

/** Nama tahap dalam grup: DP / Pelunasan, atau Termin 1..N. */
export function installmentLabel(inv: Pick<Invoice, "payment_type" | "installment">) {
  if (!inv.installment) return null;
  if (inv.payment_type === "dp") return inv.installment === 1 ? "DP" : "Pelunasan";
  return `Termin ${inv.installment}`;
}

type GroupMember = Pick<Invoice, "id" | "status" | "installment" | "delivery_gate">;

/** Tahap syarat kirim dalam grup; grup tanpa tanda memakai tahap terakhir. */
export function deliveryGate<T extends GroupMember>(group: T[]): T | undefined {
  return group.find((g) => g.delivery_gate) ?? [...group].sort((a, b) => (b.installment ?? 0) - (a.installment ?? 0))[0];
}

/**
 * Surat Jalan bisa dicetak bila invoice Paid. Grup DP / Termin: dari invoice tahap syarat kirim,
 * setelah tahap itu & semua tahap sebelumnya Paid.
 */
export function suratJalanReady(inv: GroupMember & Pick<Invoice, "group_id">, group: GroupMember[]) {
  if (inv.status !== "paid") return false;
  if (!inv.group_id) return true;
  const gate = deliveryGate(group);
  if (!gate || gate.id !== inv.id) return false;
  return group.filter((g) => (g.installment ?? 0) <= (gate.installment ?? 0)).every((g) => g.status === "paid");
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Harga satuan setelah diskon % baris. */
export const discounted = (price: number, percent = 0) => round(price * (1 - (percent || 0) / 100));

export function computeTotals(
  items: (Pick<ItemInput, "quantity" | "unit_price"> & { discount_percent?: number })[],
  taxRate: number,
  payablePercent: number | null = null,
) {
  const lines = items.map((i) => round(i.quantity * discounted(i.unit_price, i.discount_percent)));
  const subtotal = round(lines.reduce((a, b) => a + b, 0));
  const tax_amount = round((subtotal * taxRate) / 100);
  const total = round(subtotal + tax_amount);
  const payable = payablePercent ? round((total * payablePercent) / 100) : null;
  return { lines, subtotal, tax_amount, total, payable };
}

/** Format uang di dokumen invoice, mengikuti invoice existing: Rp148,000 */
export function rpDoc(n: number) {
  return (n < 0 ? "-Rp" : "Rp") + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.abs(n));
}

/** 2026-10-14 → 14/10/2026 */
export function ddmmyyyy(d: string) {
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

/** 2026-06-08 → 8 June 2026 (blok tanda tangan template PT) */
export function longDateEn(d: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(d.slice(0, 10) + "T00:00:00Z"),
  );
}

/** 2026-10-16 → 16 Oktober 2026 (Surat Jalan) */
export function longDateId(d: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(d.slice(0, 10) + "T00:00:00Z"),
  );
}

export function rupiah(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(d));
}

/** "23 Okt 2026 pukul 15.32" (WIB), untuk catatan cetak. */
export function fmtPrinted(d: string) {
  const tz = { timeZone: "Asia/Jakarta" } as const;
  const date = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", ...tz }).format(new Date(d));
  const time = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", ...tz }).format(new Date(d));
  return `${date} pukul ${time}`;
}

export function isOverdue(due: string, status: InvoiceStatus) {
  return (status === "approved" || status === "issued") && due < new Date().toISOString().slice(0, 10);
}

/** Tanggal hari ini (YYYY-MM-DD) dalam zona Asia/Jakarta. */
export function todayJakarta(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}
