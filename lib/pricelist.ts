import type { Customization } from "./types";

/**
 * Harga B2B dari "Pricelist dan Contoh Invoice.xlsx" tab "B2B PRICELIST".
 * Per seri: batas bawah qty tiap tier + harga [normal, minimum] per tier, untuk engrave & non-engrave.
 * UV Print tidak punya harga tetap (tergantung desain & vendor) → pakai harga non-engrave sebagai dasar.
 */
type Tiered = { tiers: number[]; engrave: [number, number][]; plain: [number, number][] };
type Series = { label: string } & (Tiered | { flat: [number, number] });

const BASIC = [1, 25, 50, 100, 250, 500, 1251];
const WHITE_LABEL = [1, 25, 101, 251, 500, 1251];
const COLLECTION = [1, 51, 151, 451, 1351];

const zip = (normal: number[], min: number[]) => normal.map((n, i) => [n, min[i] ?? n] as [number, number]);

const SERIES: Record<string, Series> = {
  "gs-350": {
    label: "Go-Sip 350 ml",
    tiers: BASIC,
    engrave: zip([165, 158, 156, 154, 152, 151, 149], [162, 155, 153, 151, 149, 148, 146]),
    plain: zip([145, 138, 136, 134, 132, 131, 129], [142, 135, 133, 131, 129, 128, 126]),
  },
  "gs-480": {
    label: "Go-Sip 480 ml",
    tiers: BASIC,
    engrave: zip([185, 178, 176, 174, 172, 170, 168], [182, 175, 173, 171, 169, 167, 165]),
    plain: zip([165, 158, 156, 154, 152, 150, 148], [162, 155, 153, 151, 149, 147, 145]),
  },
  "gs-700": {
    label: "Go-Sip 700 ml",
    tiers: BASIC,
    engrave: zip([264, 237, 235, 233, 231, 230, 228], [259, 232, 230, 228, 226, 225, 223]),
    plain: zip([244, 217, 215, 213, 211, 210, 208], [241, 214, 212, 210, 208, 207, 205]),
  },
  "cl-500": {
    label: "Classic 500 ml",
    tiers: BASIC,
    engrave: zip([165, 152, 150, 148, 146, 144, 142], [162, 149, 147, 145, 143, 141, 139]),
    plain: zip([145, 132, 130, 128, 126, 124, 122], [142, 129, 127, 125, 123, 121, 119]),
  },
  "clp-580": {
    label: "Classic+ 580 ml",
    tiers: BASIC,
    engrave: zip([224, 188, 186, 184, 182, 181, 179], [219, 183, 181, 179, 177, 176, 174]),
    plain: zip([204, 168, 166, 164, 162, 161, 159], [201, 165, 163, 161, 159, 158, 156]),
  },
  "mh-500": {
    label: "Metal Handle Lite 500 ml",
    tiers: BASIC,
    engrave: zip([214, 185, 183, 181, 179, 177, 175], [209, 180, 178, 176, 174, 172, 170]),
    plain: zip([194, 165, 163, 161, 159, 157, 155], [191, 162, 160, 158, 156, 154, 152]),
  },
  "mh-700": {
    label: "Metal Handle Lite 700 ml",
    tiers: BASIC,
    engrave: zip([264, 240, 238, 236, 234, 232, 230], [259, 235, 233, 231, 229, 227, 225]),
    plain: zip([244, 220, 218, 216, 214, 212, 210], [241, 217, 215, 213, 211, 209, 207]),
  },
  "om-350": {
    label: "Office Mug 350 ml (white label)",
    tiers: WHITE_LABEL,
    engrave: zip([150, 135, 130, 125, 120, 115], [145, 130, 125, 120, 115, 110]),
    plain: zip([140, 125, 120, 115, 110, 105], [135, 120, 115, 110, 105, 100]),
  },
  "sb-500": {
    label: "Sports Bottle 500 ml (white label)",
    tiers: WHITE_LABEL,
    engrave: zip([150, 145, 140, 135, 130, 125], [145, 140, 135, 130, 125, 120]),
    plain: zip([140, 135, 130, 125, 120, 115], [135, 130, 125, 120, 115, 110]),
  },
  "friends-gs-480": {
    label: "FRIENDS Go-Sip 480 ml",
    tiers: COLLECTION,
    engrave: zip([249, 239, 229, 209, 189], [244, 234, 224, 204, 184]),
    plain: zip([239, 229, 219, 199, 179], [234, 224, 214, 194, 174]),
  },
  "friends-gs-700": {
    label: "FRIENDS Go-Sip 700 ml",
    tiers: COLLECTION,
    engrave: zip([309, 299, 289, 269, 249], [304, 294, 284, 264, 244]),
    plain: zip([299, 289, 279, 259, 239], [294, 284, 274, 254, 234]),
  },
  "friends-clp-580": {
    label: "FRIENDS Classic+ 580 ml",
    tiers: COLLECTION,
    engrave: zip([309, 299, 289, 269, 249], [304, 294, 284, 264, 244]),
    plain: zip([299, 289, 279, 259, 239], [294, 284, 274, 254, 234]),
  },
  "friends-mh-700": {
    label: "FRIENDS Metal Handle Lite 700 ml",
    tiers: COLLECTION,
    engrave: zip([349, 329, 309, 289, 269], [344, 324, 304, 284, 264]),
    plain: zip([339, 319, 299, 279, 259], [334, 314, 294, 274, 254]),
  },
  "scooby-clp-580": {
    label: "Scooby Doo Classic+ 580 ml",
    tiers: COLLECTION,
    engrave: zip([309, 299, 289, 269, 249], [304, 294, 284, 264, 244]),
    plain: zip([299, 289, 279, 259, 239], [294, 284, 274, 254, 234]),
  },
  "boot": {
    label: "Boot Rubber",
    tiers: [1, 25, 101],
    engrave: zip([75, 70, 65], []),
    plain: zip([75, 70, 65], []),
  },
  "pb-s": { label: "Paper Bag Small", flat: [15, 10] },
  "pb-m": { label: "Paper Bag Medium", flat: [25, 20] },
};

function seriesKey(sku: string, product: string): string | null {
  const s = sku.trim().toLowerCase();
  const name = product.toLowerCase();
  const base = ["gs-350", "gs-480", "gs-700", "cl-500", "clp-580", "mh-500", "mh-700"].find((k) => s.startsWith(k + "-"));
  if (base) {
    if (name.includes("[friends]") && SERIES[`friends-${base}`]) return `friends-${base}`;
    if (name.includes("[scooby doo]") && SERIES[`scooby-${base}`]) return `scooby-${base}`;
    return base;
  }
  if (s.startsWith("om-350-")) return "om-350";
  if (/^(sb-500|spr-500|nl-sb-500)-/.test(s)) return "sb-500";
  if (s.startsWith("acs-bt")) return "boot";
  if (s.startsWith("pb-s-") || s === "pb-s") return "pb-s";
  if (s.startsWith("pb-m-") || s === "pb-m") return "pb-m";
  return null;
}

/** Tier dalam Rupiah penuh: qty minimum tiap tier (naik, mulai 1) + harga [normal, minimum] per tier. */
export type SeriesPrice = { label: string; tiers: number[]; engrave: [number, number][]; plain: [number, number][] };
export type Pricelist = Record<string, SeriesPrice>;

/** Key app_settings untuk override harga oleh admin (JSON Pricelist parsial). */
export const PRICELIST_KEY = "pricelist_overrides";

const toRp = ([n, m]: [number, number]): [number, number] => [n * 1000, m * 1000];

/** Pricelist default (sumber: kode). Paper bag dll. yang flat = satu tier mulai qty 1. */
export const DEFAULT_PRICELIST: Pricelist = Object.fromEntries(
  Object.entries(SERIES).map(([k, s]) => [
    k,
    "flat" in s
      ? { label: s.label, tiers: [1], engrave: [toRp(s.flat)], plain: [toRp(s.flat)] }
      : { label: s.label, tiers: s.tiers, engrave: s.engrave.map(toRp), plain: s.plain.map(toRp) },
  ]),
);

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/** Pesan error bila data tier tidak konsisten; null bila valid. */
export function validateSeries(s: SeriesPrice): string | null {
  if (!Array.isArray(s.tiers) || !s.tiers.length) return "minimal 1 tier";
  if (s.tiers[0] !== 1) return "tier pertama harus mulai dari qty 1";
  for (let i = 0; i < s.tiers.length; i++) {
    if (!isInt(s.tiers[i]) || s.tiers[i] < 1) return `qty minimum tier ${i + 1} tidak valid`;
    if (i && s.tiers[i] <= s.tiers[i - 1]) return `qty minimum tier ${i + 1} harus lebih besar dari tier sebelumnya`;
  }
  for (const [name, rows] of [["engrave", s.engrave], ["non-engrave", s.plain]] as const) {
    if (!Array.isArray(rows) || rows.length !== s.tiers.length) return `jumlah harga ${name} tidak sama dengan jumlah tier`;
    for (let i = 0; i < rows.length; i++) {
      const [n, m] = rows[i] ?? [];
      if (!isInt(n) || !isInt(m) || n <= 0 || m <= 0) return `harga ${name} tier ${i + 1} harus bilangan bulat > 0`;
      if (m > n) return `harga minimum ${name} tier ${i + 1} melebihi harga normal`;
    }
  }
  return null;
}

/** Gabungkan override tersimpan ke default. Override rusak/series tak dikenal diabaikan (fallback default). */
export function resolvePricelist(raw: string | null): Pricelist {
  if (!raw) return DEFAULT_PRICELIST;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return DEFAULT_PRICELIST;
  }
  const out: Pricelist = { ...DEFAULT_PRICELIST };
  for (const [k, s] of Object.entries((o ?? {}) as Record<string, SeriesPrice>)) {
    if (DEFAULT_PRICELIST[k] && s && !validateSeries(s)) out[k] = { ...s, label: DEFAULT_PRICELIST[k].label };
  }
  return out;
}

const tierLabel = (tiers: number[], i: number) => (tiers[i + 1] ? `${tiers[i]}–${tiers[i + 1] - 1} pcs` : `≥ ${tiers[i]} pcs`);

/** Label rentang qty tiap tier, mis. "25–49 pcs". */
export const tierLabels = (s: SeriesPrice) => s.tiers.map((_, i) => tierLabel(s.tiers, i));

export type PriceQuote = { series: string; tier: string; normal: number; min: number };

/** Harga pricelist untuk barang & qty tertentu; null bila barang tidak ada di pricelist atau qty tidak valid. */
export function quotePrice(
  sku: string,
  product: string,
  quantity: number,
  customization: Customization,
  list: Pricelist = DEFAULT_PRICELIST,
): PriceQuote | null {
  const key = seriesKey(sku, product);
  const s = key ? list[key] : null;
  if (!s || !Number.isInteger(quantity) || quantity < 1) return null;
  let i = 0;
  while (i + 1 < s.tiers.length && quantity >= s.tiers[i + 1]) i++;
  const [normal, min] = (customization === "engrave" ? s.engrave : s.plain)[i];
  return { series: s.label, tier: s.tiers.length > 1 ? tierLabel(s.tiers, i) : "semua qty", normal, min };
}
