import { PricelistEditor } from "@/components/PricelistEditor";
import { requireProfile } from "@/lib/auth";
import { DEFAULT_PRICELIST } from "@/lib/pricelist";
import { getPricelist } from "@/lib/service";

export const metadata = { title: "Pricelist" };

export default async function PricelistPage() {
  const me = await requireProfile();
  const list = await getPricelist();
  return (
    <>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>Pricelist</h1>
          <div className="sub">
            Harga B2B per tier qty (Rp/pcs). Dipakai sebagai saran harga saat membuat invoice; perubahan tidak mengubah
            invoice yang sudah dibuat. Harga nego per customer cukup diisi manual di unit price item.
          </div>
        </div>
      </div>
      <PricelistEditor list={list} defaults={DEFAULT_PRICELIST} canEdit={me.role === "admin"} />
    </>
  );
}
