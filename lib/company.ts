import type { Entity } from "./types";

/** Entitas penerbit invoice — sesuai template "Inv PT" & "Invoice Domma (TMB)". */
export const ENTITIES: Record<
  Entity,
  {
    short: string;
    name: string;
    logo: { src: string; width: number; height: number };
    address: string[];
    email: string;
    payment: string;
    /** Template PT memakai blok tempat & tanggal + nama penanda tangan di kanan bawah. */
    signature: boolean;
  }
> = {
  dts: {
    short: "Domma Teman Setia",
    name: "PT Domma Teman Setia",
    logo: { src: "/brand/dts.jpg", width: 233, height: 67 },
    address: ["Jl. Dr. Muwardi I No. 33, Grogol, Grogol Petamburan", "Kota Adm. Jakarta Barat, 11450"],
    email: "hi@withdomma.com",
    payment: "BCA\t8740538528\nPT Domma Teman Setia",
    signature: true,
  },
  tmb: {
    short: "Teman Melangkah Bersama",
    name: "PT Teman Melangkah Bersama",
    logo: { src: "/brand/tmb.png", width: 930, height: 336 },
    address: ["Jl. Dr. Muwardi I No. 33, Grogol, Grogol Petamburan", "Kota Adm. Jakarta Barat, 11450"],
    email: "hi@withdomma.com",
    payment: "BCA\t8740550285\nPT TEMAN MELANGKAH BERSAMA",
    signature: false,
  },
};

export const CITY = "Jakarta";

/** Remarks standar dari invoice existing. Format: <b>, <i>, <u> (lihat components/Rich.tsx). */
export const DEFAULT_REMARKS = [
  "Biaya pengiriman merupakan biaya jasa pihak ketiga dan tidak termasuk objek pemotongan pajak.",
  "Mohon mencantumkan nomor invoice sebagai referensi pada saat melakukan pembayaran.",
  "Pembayaran jatuh tempo 14 hari setelah invoice terbit",
  "Complain <b>MAX 7 HARI KERJA</b> setelah barang diterima",
].join("\n");

/** Key app setting untuk remarks default yang disimpan admin (menimpa DEFAULT_REMARKS). */
export const DEFAULT_REMARKS_KEY = "default_remarks";

export const UOM_OPTIONS = ["Pcs", "Rit", "Set", "Box", "Pack", "Lot", "Unit"];

/** Saran kurir baris pengiriman (tetap bisa diisi bebas). */
export const COURIER_OPTIONS = ["Lalamove", "GoSend", "GrabExpress", "J&T Express", "J&T Cargo", "JNE", "Lion Parcel", "SiCepat", "Paxel", "Deliveree"];

/** Sufiks nama file PDF per entitas, sesuai template "Date_Invoice_Name - ...". */
export const PDF_SUFFIX: Record<Entity, string> = { dts: "Inv PT", tmb: "Invoice Domma (TMB)" };

/** Nama file invoice: DDMMYYYY_Invoice_<Customer> - <sufiks entitas>. */
export function invoiceFileName(inv: { invoice_date: string; company_name: string; entity?: Entity | null }) {
  const [y, m, d] = inv.invoice_date.slice(0, 10).split("-");
  const name = inv.company_name.replace(/[\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  return `${d}${m}${y}_Invoice_${name} - ${PDF_SUFFIX[inv.entity ?? "dts"]}`;
}
