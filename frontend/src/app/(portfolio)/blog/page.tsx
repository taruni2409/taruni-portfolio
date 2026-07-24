import { getAllPosts } from "@/lib/blog";
import BlogSectionDynamic from "@/components/blog/BlogSectionDynamic";
import BlogSwitcher from "@/components/blog/BlogSwitcher";
import { profile } from "@/data/profile";

export const metadata = {
  title: "Blog",
  description:
    "Technical writing on AI systems, ML infrastructure, distributed computing, and software craft by Taruni Nallamothu. Notes on building things that actually work.",
  alternates: { canonical: "https://taruni-portfolio.vercel.app/blog" },
  openGraph: {
    type: "website" as const,
    url: "https://taruni-portfolio.vercel.app/blog",
    title: "Blog — Taruni Nallamothu",
    description: "Notes on AI systems, ML infrastructure, distributed computing, and software craft.",
  },
};

export default function BlogIndexPage() {
  // Build-time MDX posts — used as fallback if the API is unreachable
  const staticPosts = getAllPosts();

  return (
    <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 xl:px-8 py-12 sm:py-16">
      <header className="mb-12 sm:mb-16">
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">
          Writing · Decoding WHY&apos;s
        </p>

        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-fg">My Scratchpad</h1>
            <span className="text-2xl sm:text-3xl select-none text-fg-faint" aria-hidden>✦</span>
          </div>
          <BlogSwitcher
            posts={staticPosts.map((p) => ({ slug: p.slug, title: p.title, date: p.date }))}
          />
        </div>

        <p className="text-sm font-medium text-accent mb-3">
          Inspire <em className="not-italic text-fg-faint">n</em> [One]
        </p>

        {profile.page_blog && (
          <p className="text-sm text-fg-subtle max-w-xl leading-relaxed">
            {profile.page_blog}
          </p>
        )}
      </header>

      {/* BlogSectionDynamic fetches from API on the client; falls back to staticPosts */}
      <BlogSectionDynamic staticPosts={staticPosts} />

    </div>
  );
}
