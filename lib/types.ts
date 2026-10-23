export type Role = "admin" | "finance";

export type InvoiceStatus =
  | "draft"
  | "on_check"
  | "revision_requested"
  | "rejected"
  | "approved"
  | "issued"
  | "paid"
  | "cancelled";

export type Customization = "engrave" | "uv_print" | "plain";

export type PaymentType = "cbd" | "dp" | "termin" | "top";

/** Entitas penerbit: PT Domma Teman Setia / PT Teman Melangkah Bersama. */
export type Entity = "dts" | "tmb";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

export interface Pic {
  id: string;
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
}

export interface Customer {
  id: string;
  company_name: string;
  billing_address: string | null;
  npwp: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  pics: Pic[];
}

export type CustomerInput = Pick<Customer, "company_name" | "billing_address" | "npwp" | "phone" | "email" | "notes">;
export type PicInput = { id?: string; name: string; email: string | null; phone: string | null; position: string | null };

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  position: number;
  sku: string | null;
  product: string;
  quantity: number;
  uom: string;
  unit_price: number;
  /** Diskon % per baris (0 = tanpa diskon). */
  discount_percent: number;
  customization: Customization;
  notes: string | null;
  line_total: number;
}

export type ItemInput = Pick<InvoiceItem, "sku" | "product" | "quantity" | "uom" | "unit_price" | "discount_percent" | "customization" | "notes">;

export interface Invoice {
  id: string;
  invoice_number: string | null;
  entity: Entity;
  payment_type: PaymentType;
  status: InvoiceStatus;
  customer_id: string | null;
  pic_id: string | null;
  company_name: string;
  pic_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  npwp: string | null;
  invoice_date: string;
  due_date: string;
  /** Remarks di invoice (multi-baris, **tebal** didukung). */
  notes: string | null;
  term_of_payment: string | null;
  /** Info pembayaran (rekening / link Xendit), multi-baris. */
  payment_info: string | null;
  /** Baris tagihan parsial, mis. "DP 50%" / "Total Termin 3". */
  payable_label: string | null;
  payable_percent: number | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  revision_notes: string | null;
  pdf_url: string | null;
  email_sent_at: string | null;
  sheets_synced_at: string | null;
  created_by: string | null;
  created_by_email: string | null;
  approved_by: string | null;
  approved_at: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  /** Grup invoice DP / Termin: semua tahap berbagi group_id yang sama. */
  group_id: string | null;
  /** Urutan tahap dalam grup (1 = DP / Termin 1); null = invoice tunggal. */
  installment: number | null;
  /** Tahap syarat kirim: Surat Jalan bisa dicetak setelah tahap ini & sebelumnya Paid. */
  delivery_gate: boolean;
  /** Cetak pertama setelah approve: kapan & oleh siapa (null = belum dicetak). */
  printed_at: string | null;
  printed_by: string | null;
  printed_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceEvent {
  id: string;
  invoice_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  from_status: InvoiceStatus | null;
  to_status: InvoiceStatus | null;
  notes: string | null;
  created_at: string;
}

export type WebhookStatus = "pending" | "sent" | "failed" | "skipped";

export interface WebhookEvent {
  id: string;
  event_type: string;
  invoice_id: string;
  payload: Record<string, unknown>;
  status: WebhookStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

/** Pembayaran invoice beserta bukti transfer (file di storage privat). */
export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  proof_path: string;
  file_name: string;
  content_type: string;
  notes: string | null;
  created_by: string | null;
  created_by_email: string | null;
  /** Waktu bukti diupload = tanggal pembayaran. */
  created_at: string;
}

export interface InvoiceFull extends Invoice {
  items: InvoiceItem[];
  payments: Payment[];
  events: InvoiceEvent[];
  webhooks: WebhookEvent[];
}
