import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  const posts = getAllPosts();
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  // "output: export" requires at least one static param per dynamic route.
  if (tags.length === 0) return [{ tag: "_placeholder" }];
  return tags.map((tag) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded} — Blog`,
    description: `All posts tagged with ${decoded} by Taruni Nallamothu.`,
    alternates: { canonical: `https://jayaremala.com/blog/tag/${tag}` },
  };
}

export default async function BlogTagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const allPosts = getAllPosts();
  const posts = allPosts.filter((p) => p.tags.includes(decoded));

  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/blog"
          aria-label="Back to all posts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-fg transition-colors mb-6 min-h-[44px] sm:min-h-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          All posts
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span
            className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-accent-light px-3 py-1 text-sm font-semibold text-accent"
          >
            #{decoded}
          </span>
          <span className="text-sm text-fg-faint">{posts.length} post{posts.length !== 1 ? "s" : ""}</span>
        </div>

        <p className="text-fg-subtle text-sm">All writing tagged with <strong className="text-fg">#{decoded}</strong>.</p>
      </div>

      {/* Post list */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded-2xl border border-border bg-surface p-5 hover:border-border-strong card-lift transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <h2 className="font-semibold text-fg text-base leading-snug group-hover:text-accent transition-colors">
                  {post.title}
                </h2>
                {post.description && (
                  <p className="text-sm text-fg-subtle leading-relaxed line-clamp-2">{post.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-fg-faint tabular-nums">{post.publishedAt ?? post.date}</span>
                  <span className="text-border text-[10px]">·</span>
                  <span className="text-[11px] text-fg-faint">{post.readingTime} min read</span>
                  {post.tags.filter((t) => t !== decoded).slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-fg-muted"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
