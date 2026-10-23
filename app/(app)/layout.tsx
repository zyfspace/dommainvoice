import { requireProfile, roleLabel } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile();
  const pending = await repo.countInvoices(me.role === "finance" ? "on_check" : "revision_requested");
  return (
    <div className="app">
      <Sidebar me={me} roleLabel={roleLabel(me)} pending={pending} />
      <main className="main">{children}</main>
    </div>
  );
}
