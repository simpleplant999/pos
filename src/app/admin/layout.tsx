import { BackOfficeNav } from "@/components/admin/BackOfficeNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-100">
      <BackOfficeNav />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
