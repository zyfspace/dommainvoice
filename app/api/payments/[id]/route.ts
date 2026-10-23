import { getProfile } from "@/lib/auth";
import { repo } from "@/lib/repo";

/** Tampilkan bukti transfer (storage privat) — hanya untuk user yang login. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getProfile())) return new Response("Unauthorized", { status: 401 });
  const p = await repo.getPayment((await params).id);
  const file = p && (await repo.readProof(p.proof_path));
  if (!p || !file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": p.content_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(p.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
