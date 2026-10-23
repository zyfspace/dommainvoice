import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerForm } from "@/components/CustomerForm";
import { Icon } from "@/components/Icon";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Customer baru" };

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/customers");
  const { return_to } = await searchParams;
  const back = return_to?.startsWith("/") ? return_to : undefined;
  return (
    <>
      <Link href={back ?? "/customers"} className="crumb">
        <Icon n="back" s={14} /> {back ? "Kembali ke invoice" : "Customers"}
      </Link>
      <div className="top">
        <h1>Customer baru</h1>
      </div>
      <CustomerForm returnTo={back} />
    </>
  );
}
