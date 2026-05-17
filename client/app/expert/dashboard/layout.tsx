import { ExpertAuthGuard } from "@/components/expert/ExpertAuthGuard";

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  return <ExpertAuthGuard>{children}</ExpertAuthGuard>;
}
