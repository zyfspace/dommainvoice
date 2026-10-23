import { CUSTOMIZATION_LABEL } from "./domain";
import type { Invoice, InvoiceItem } from "./types";

/**
 * Baris untuk sheet "[2026] Offline Laser Request" (tab BULK ORDER), satu baris per item.
 * Kolom header invoice hanya diisi di baris pertama, mengikuti template client.
 * Kolom operasional (No, Tanggal Kirim, Payment, Diterima Cust, Kota, Kurir, Tanggal Received)
 * dibiarkan kosong: diisi n8n (No) atau tim gudang secara manual.
 */
export interface LaserRow {
  No: number | null;
  "Tanggal Input": string;
  "No. Docs": string;
  "Nama Client": string;
  "Total Qty (Pcs)": number | null;
  "Tanggal Kirim": string;
  SKU: string;
  Produk: string;
  Varian: string;
  Qty: number;
  "Total Order": number | null;
  File: string;
  Engrave: string;
  Payment: string;
  "Diterima Cust": string;
  "Kota Pengiriman": string;
  "Kurir Pengiriman": string;
  "Tanggal Received": string;
}

const jakartaDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));

function clientName(inv: Invoice) {
  const pic = inv.pic_name?.trim();
  return pic && pic.toLowerCase() !== inv.company_name.trim().toLowerCase()
    ? `${pic} (${inv.company_name})`
    : inv.company_name;
}

function engrave(item: InvoiceItem) {
  if (item.customization === "plain") return "-";
  return item.notes?.trim() ? `${CUSTOMIZATION_LABEL[item.customization]}: ${item.notes.trim()}` : CUSTOMIZATION_LABEL[item.customization];
}

export function laserRows(inv: Invoice, items: InvoiceItem[]): LaserRow[] {
  const date = jakartaDate(inv.approved_at ?? new Date().toISOString());
  const client = clientName(inv);
  const [y, m, d] = date.split("-");
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item, idx) => {
      const first = idx === 0;
      return {
        No: null,
        "Tanggal Input": first ? date : "",
        "No. Docs": first ? (inv.invoice_number ?? "") : "",
        "Nama Client": first ? client : "",
        "Total Qty (Pcs)": first ? totalQty : null,
        "Tanggal Kirim": "",
        SKU: item.sku ?? "",
        Produk: item.product,
        Varian: "",
        Qty: item.quantity,
        "Total Order": first ? inv.total : null,
        File: first ? `${d}${m}${y}_${client}` : "",
        Engrave: engrave(item),
        Payment: "",
        "Diterima Cust": "",
        "Kota Pengiriman": "",
        "Kurir Pengiriman": "",
        "Tanggal Received": "",
      };
    });
}
