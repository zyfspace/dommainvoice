import { requireProfile, roleLabel } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile();
  const invoices = await repo.listInvoices();
  const pending =
    me.role === "finance"
      ? invoices.filter((i) => i.status === "on_check").length
      : invoices.filter((i) => i.status === "revision_requested").length;
  return (
    <div className="app">
      <Sidebar me={me} roleLabel={roleLabel(me)} pending={pending} />
      <main className="main">{children}</main>
    </div>
  );
}
