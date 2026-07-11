import GalleryGrid from "@/components/GalleryGrid";
import { gallery } from "@/data/gallery";
import { profile } from "@/data/profile";

export const metadata = {
  title: "Gallery",
  description: "Moments, milestones, and achievements — a visual log from Taruni Nallamothu.",
  alternates: { canonical: "https://jayaremala.com/gallery" },
  openGraph: {
    type: "website" as const,
    url: "https://jayaremala.com/gallery",
    title: "Gallery — Taruni Nallamothu",
    description: "Moments, milestones, and achievements in pictures.",
  },
};

export default function GalleryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <header className="mb-10 sm:mb-12 relative">
        <div
          className="absolute -top-8 -right-8 w-72 h-72 rounded-full blur-3xl pointer-events-none -z-10"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.06) 60%, transparent 100%)" }}
          aria-hidden
        />
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">Moments · Milestones</p>
        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg">Gallery</h1>
          <span
            className="text-2xl sm:text-3xl select-none"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            aria-hidden
          >◆</span>
        </div>
        {profile.page_gallery && (
          <p className="text-sm text-fg-subtle max-w-xl leading-relaxed">
            {profile.page_gallery}
          </p>
        )}
      </header>

      <GalleryGrid items={gallery} />
    </div>
  );
}
