import { projects } from "@/data/projects";
import { profile } from "@/data/profile";
import ProjectsGrid from "@/components/ProjectsGrid";

export const metadata = {
  title: "Projects",
  description:
    "Portfolio of AI systems, distributed infrastructure, and hackathon-winning projects — RAG pipelines, Edge AI inference on Snapdragon NPUs, and more.",
  alternates: { canonical: "https://jayaremala.com/projects" },
  openGraph: {
    type: "website" as const,
    url: "https://jayaremala.com/projects",
    title: "Projects — Taruni Nallamothu",
    description: "AI systems, distributed infrastructure, and hackathon-winning projects — RAG, Edge AI, LangGraph, FastAPI.",
  },
};

export default function ProjectsPage() {
  const featuredCount = projects.filter((p) => p.featured).length;
  const awardCount    = projects.filter((p) => p.award).length;

  return (
    <div className="mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] px-4 sm:px-6 xl:px-8 py-12 sm:py-16">

      {/* Header */}
      <header className="mb-10 sm:mb-12 relative">
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">Work · Built Things</p>

        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg">Projects</h1>
          <span className="text-xl sm:text-2xl font-mono select-none text-fg-faint" aria-hidden>{"{ }"}</span>
        </div>

        {profile.page_projects && (
          <p className="text-sm text-fg-subtle max-w-xl leading-relaxed mb-4">
            {profile.page_projects}
          </p>
        )}

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
            {projects.length} projects
          </span>
          {featuredCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-border-strong" />
              {featuredCount} featured
            </span>
          )}
          {awardCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 0-3 3" /></svg>{awardCount} award-winning
            </span>
          )}
        </div>
      </header>

      <ProjectsGrid projects={projects} />
    </div>
  );
}
