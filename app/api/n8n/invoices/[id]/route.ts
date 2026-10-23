import { ENTITIES } from "@/lib/company";
import { CUSTOMIZATION_LABEL, PAYMENT_TYPES } from "@/lib/domain";
import { laserRows } from "@/lib/laser";
import { printToken, verifyCallback } from "@/lib/n8n";
import { repo } from "@/lib/repo";

/** n8n mengambil data invoice final (WF-01 step 3, WF-03 step 2, WF-04 step 1). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!verifyCallback(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const inv = await repo.getInvoice((await ctx.params).id);
  if (!inv) return Response.json({ error: "not_found" }, { status: 404 });
  const { events: _e, webhooks: _w, ...data } = inv;
  const token = printToken(inv.id);
  return Response.json({
    ...data,
    payment_type_label: PAYMENT_TYPES[inv.payment_type].label,
    issuer: ENTITIES[inv.entity],
    items: inv.items.map((i) => ({ ...i, customization_label: CUSTOMIZATION_LABEL[i.customization] })),
    print_url: `${process.env.APP_URL ?? ""}/invoices/${inv.id}/print`,
    /** URL cetak dengan token 15 menit, untuk dirender n8n menjadi PDF (tanpa login). */
    pdf_render_url: token ? `${process.env.APP_URL ?? ""}/invoices/${inv.id}/print?token=${encodeURIComponent(token)}` : null,
    laser_rows: laserRows(inv, inv.items),
  });
}
