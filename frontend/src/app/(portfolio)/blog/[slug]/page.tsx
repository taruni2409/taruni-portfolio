import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import type { Options as PrettyCodeOptions } from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { getAllPosts, getAllSlugs, getPostBySlug } from "@/lib/blog";
import type { PostMeta } from "@/lib/blog";
import Link from "next/link";
import { mdxComponents } from "@/components/blog/MDXComponents";
import BlogEngagement from "@/components/blog/BlogEngagement";
import ShareButtons from "@/components/blog/ShareButtons";
import BlogViewCount from "@/components/blog/BlogViewCount";
import ReadingMode from "@/components/blog/ReadingMode";
import FontSizeControl from "@/components/blog/FontSizeControl";
import BlogSwitcher from "@/components/blog/BlogSwitcher";
import { TableOfContents, MobileTOC } from "@/components/blog/TableOfContents";
import type { Heading } from "@/components/blog/TableOfContents";
import BlogPostMarkdown from "@/components/blog/BlogPostMarkdown";
import ProseReveal from "@/components/blog/ProseReveal";
import { normalizeBlogPost } from "@/lib/api/content";
import type { ApiBlogPost } from "@/lib/api/content";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark-dimmed" },
  keepBackground: false,
  defaultLang: "plaintext",
};

const SITE_URL = "https://taruni-portfolio.vercel.app";

type Props = { params: Promise<{ slug: string }> };

// Same reasoning as the lab [slug] route: without this, a slug that drops out of
// generateStaticParams (e.g. a deleted/renamed content.db post) can keep serving
// from Vercel's ISR cache indefinitely instead of 404ing.
export const dynamicParams = false;

function extractHeadings(markdown: string): Heading[] {
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map(([, hashes, text]) => ({
    level: hashes.length as 2 | 3,
    text: text.trim(),
    id: text.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"),
  }));
}

async function getMergedAllPosts(): Promise<PostMeta[]> {
  const mdxPosts = getAllPosts();
  const mdxSlugs = new Set(mdxPosts.map((p) => p.slug));
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiUrl}/content/blog`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const apiPosts: ApiBlogPost[] = await res.json();
      const extras = apiPosts.filter((p) => !mdxSlugs.has(p.slug)).map(normalizeBlogPost);
      return [...mdxPosts, ...extras].sort(
        (a, b) => ((a.publishedAt ?? a.date) < (b.publishedAt ?? b.date) ? 1 : -1)
      );
    }
  } catch { /* API not available at build time — use MDX only */ }
  return mdxPosts;
}

/** Full-featured view for admin-created posts (no MDX file, plain markdown content). */
function BlogPostApiView({ post, allPosts }: { post: ApiBlogPost; allPosts: PostMeta[] }) {
  const normalized = normalizeBlogPost(post);
  const currentIdx = allPosts.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIdx < allPosts.length - 1 ? allPosts[currentIdx + 1] : null;
  const nextPost = currentIdx > 0 ? allPosts[currentIdx - 1] : null;
  const related = allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ ...p, score: p.tags.filter((t) => post.tags.includes(t)).length }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  const headings = extractHeadings(post.content);

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-[68rem] px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          All posts
        </Link>
        <div className="hidden sm:block">
          <BlogSwitcher
            posts={allPosts.map((p) => ({ slug: p.slug, title: p.title, date: p.date }))}
            currentSlug={post.slug}
          />
        </div>
      </div>

      <div className="lg:flex lg:gap-14 lg:items-start">
        <div className="flex-1 min-w-0">
          <article>
            <header className="mb-10 pb-8 border-b border-border">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg leading-tight mb-4 font-[family-name:var(--font-blog)]">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-sm text-fg-faint">{post.date}</span>
                  <span className="text-fg-faint/40 select-none" aria-hidden>·</span>
                  <span className="text-sm text-fg-faint">{normalized.readingTime} min read</span>
                  <BlogViewCount slug={post.slug} />
                </div>
                <div className="flex items-center gap-2">
                  <FontSizeControl />
                  <span className="w-px h-3.5 bg-border" aria-hidden />
                  <ReadingMode />
                </div>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/blog/tag/${encodeURIComponent(t)}`}
                      className="rounded-sm bg-surface-raised border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle hover:text-accent transition-colors"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}
              <div className="sm:hidden mb-3">
                <BlogSwitcher
                  posts={allPosts.map((p) => ({ slug: p.slug, title: p.title, date: p.date }))}
                  currentSlug={post.slug}
                />
              </div>
              <ShareButtons slug={post.slug} title={post.title} />
            </header>

            <MobileTOC headings={headings} />

            <ProseReveal
              className="prose font-[family-name:var(--font-blog)] leading-[1.85]"
              style={{ fontSize: "var(--blog-font-size, 1.0625rem)" }}
            >
              <BlogPostMarkdown content={post.content} />
            </ProseReveal>

            <BlogEngagement slug={post.slug} />
          </article>

          {related.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-4">You might also like</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group block rounded-card border border-border bg-surface p-4 hover:border-border-strong transition-all card-lift"
                  >
                    <h3 className="text-sm font-semibold text-fg group-hover:text-accent transition-colors leading-snug mb-1.5">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-fg-faint mb-2">{p.date}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-sm bg-surface-raised border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-16 pt-8 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-card border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Previous
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">
                    {prevPost.title}
                  </span>
                  <span className="text-[10px] text-fg-faint">{prevPost.date}</span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-card border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all sm:text-right"
                >
                  <span className="inline-flex items-center sm:justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    Next
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">
                    {nextPost.title}
                  </span>
                  <span className="text-[10px] text-fg-faint">{nextPost.date}</span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-accent transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to all posts
              </Link>
            </div>
          </div>
        </div>

        {headings.length >= 2 && (
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const fsslugs = new Set(getAllSlugs());
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiUrl}/content/blog`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const apiPosts: { slug: string }[] = await res.json();
      for (const p of apiPosts) fsslugs.add(p.slug);
    }
  } catch {
    // API not available during build — filesystem slugs are the baseline
  }
  // "output: export" requires at least one static param per dynamic route —
  // fall back to a placeholder that resolves to notFound() when there are no posts yet.
  const slugs = fsslugs.size ? Array.from(fsslugs) : ["_placeholder"];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? slug;
  const description = post?.description ?? "";
  const tags = post?.tags ?? [];
  const image = post?.image;
  const publishedAt = post ? (post.publishedAt ?? post.date) : "";

  if (!post) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/content/blog/${slug}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const apiPost = await res.json();
        const url = `${SITE_URL}/blog/${slug}`;
        return {
          title: apiPost.title,
          description: apiPost.description,
          keywords: apiPost.tags,
          alternates: { canonical: url },
          openGraph: {
            type: "article" as const,
            url,
            title: apiPost.title,
            description: apiPost.description,
            siteName: "Taruni Nallamothu",
            publishedTime: apiPost.published_at,
            authors: ["Taruni Nallamothu"],
            tags: apiPost.tags,
            images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: apiPost.title }],
          },
        };
      }
    } catch { /* silent */ }
    return {};
  }

  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title,
    description,
    keywords: tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article" as const,
      url,
      title,
      description,
      siteName: "Taruni Nallamothu",
      publishedTime: publishedAt,
      authors: ["Taruni Nallamothu"],
      tags,
      images: [{ url: image ? `${SITE_URL}${image}` : `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [image ? `${SITE_URL}${image}` : `${SITE_URL}/og-image.png`],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  // Build merged post list once — used for switcher, prev/next, related in both views
  const allPosts = await getMergedAllPosts();

  // If not an MDX post, try the content API (admin-published post)
  if (!post) {
    let apiPost: ApiBlogPost | null = null;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/content/blog/${slug}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) apiPost = await res.json();
    } catch { /* fall through to notFound */ }
    if (!apiPost) notFound();
    return <BlogPostApiView post={apiPost} allPosts={allPosts} />;
  }

  const headings = extractHeadings(post.content);

  // Use merged allPosts for switcher/prev/next so admin posts appear in navigation
  const currentIdx = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIdx < allPosts.length - 1 ? allPosts[currentIdx + 1] : null;
  const nextPost = currentIdx > 0 ? allPosts[currentIdx - 1] : null;

  const related = allPosts
    .filter((p) => p.slug !== slug)
    .map((p) => ({ ...p, score: p.tags.filter((t) => post.tags.includes(t)).length }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const publishedAt = post.publishedAt ?? post.date;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${slug}`,
    datePublished: publishedAt,
    dateModified: post.date ?? publishedAt,
    author: { "@type": "Person", name: "Taruni Nallamothu", url: SITE_URL },
    publisher: { "@type": "Person", name: "Taruni Nallamothu", url: SITE_URL },
    keywords: post.tags?.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}` },
  };

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-[68rem] px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          All posts
        </Link>
        {/* Desktop: switcher in breadcrumb row */}
        <div className="hidden sm:block">
          <BlogSwitcher
            posts={allPosts.map((p) => ({ slug: p.slug, title: p.title, date: p.date }))}
            currentSlug={slug}
          />
        </div>
      </div>

      <div className="lg:flex lg:gap-14 lg:items-start">
        <div className="flex-1 min-w-0">
          <article>
            <header className="mb-10 pb-8 border-b border-border">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg leading-tight mb-4 font-[family-name:var(--font-blog)]">
                {post.title}
              </h1>
              {/* Meta row: date · reading time · views | font size + reading mode */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-sm text-fg-faint">{post.publishedAt ?? post.date}</span>
                  {post.publishedAt && post.date && post.date !== post.publishedAt && (
                    <>
                      <span className="text-fg-faint/40 select-none" aria-hidden>·</span>
                      <span className="text-sm text-fg-faint">Updated {post.date}</span>
                    </>
                  )}
                  <span className="text-fg-faint/40 select-none" aria-hidden>·</span>
                  <span className="text-sm text-fg-faint">{post.readingTime} min read</span>
                  <BlogViewCount slug={post.slug} />
                </div>
                <div className="flex items-center gap-2">
                  <FontSizeControl />
                  <span className="w-px h-3.5 bg-border" aria-hidden />
                  <ReadingMode />
                </div>
              </div>
              {/* Tags row */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/blog/tag/${encodeURIComponent(t)}`}
                      className="rounded-sm bg-surface-raised border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle hover:text-accent transition-colors"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}
              {/* Mobile: switcher below heading where dropdown has room to open */}
              <div className="sm:hidden mb-3">
                <BlogSwitcher
                  posts={allPosts.map((p) => ({ slug: p.slug, title: p.title, date: p.date }))}
                  currentSlug={slug}
                />
              </div>
              <ShareButtons slug={post.slug} title={post.title} />
            </header>

            {/* Mobile TOC — inline before content */}
            <MobileTOC headings={headings} />

            <ProseReveal
              className="prose font-[family-name:var(--font-blog)] leading-[1.85]"
              style={{ fontSize: "var(--blog-font-size, 1.0625rem)" }}
            >
              <MDXRemote
                source={post.content}
                components={mdxComponents}
                options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions]] } }}
              />
            </ProseReveal>

            <BlogEngagement slug={post.slug} />
          </article>

          {/* Related posts */}
          {related.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-4">You might also like</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group block rounded-card border border-border bg-surface p-4 hover:border-border-strong transition-all card-lift"
                  >
                    <h3 className="text-sm font-semibold text-fg group-hover:text-accent transition-colors leading-snug mb-1.5">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-fg-faint mb-2">{p.date}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-sm bg-surface-raised border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Next / Previous post navigation */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prev = older post */}
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-card border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Previous
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">
                    {prevPost.title}
                  </span>
                  <span className="text-[10px] text-fg-faint">{prevPost.date}</span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}

              {/* Next = newer post */}
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-card border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all sm:text-right"
                >
                  <span className="inline-flex items-center sm:justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    Next
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">
                    {nextPost.title}
                  </span>
                  <span className="text-[10px] text-fg-faint">{nextPost.date}</span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-accent transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to all posts
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop TOC sidebar */}
        {headings.length >= 2 && (
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
  );
}
