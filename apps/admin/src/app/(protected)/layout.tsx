import { RequireAdmin } from "@/components/RequireAdmin";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
