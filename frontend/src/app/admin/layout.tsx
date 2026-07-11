import type { Metadata } from "next";
import { GitHubStagingProvider } from "@/lib/githubStaging";
import PublishBar from "@/components/admin/PublishBar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <GitHubStagingProvider>
      {/* padding so the fixed PublishBar never covers page content */}
      <div className="pb-24">{children}</div>
      <PublishBar />
    </GitHubStagingProvider>
  );
}
