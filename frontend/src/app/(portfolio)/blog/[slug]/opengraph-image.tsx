import { ImageResponse } from "next/og";
import { getPostBySlug, getAllSlugs } from "@/lib/blog";

export const dynamic = "force-static";

export function generateStaticParams() {
  const slugs = getAllSlugs();
  // "output: export" requires at least one static param per dynamic route.
  return (slugs.length ? slugs : ["_placeholder"]).map((slug) => ({ slug }));
}
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const title       = post?.title       ?? slug;
  const description = post?.description ?? "";
  const tags        = (post?.tags ?? []).slice(0, 3);
  const readingTime = post?.readingTime ?? null;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: "#0c0a14", display: "flex", flexDirection: "column", position: "relative", fontFamily: "Georgia, 'Times New Roman', serif", overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(123,114,240,0.12) 0%, transparent 70%)" }} />
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "linear-gradient(to bottom, #7b72f0, #a78bfa)" }} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 72px 52px 78px", justifyContent: "space-between" }}>
          {/* Top */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #10b981, #7b72f0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 14, fontFamily: "system-ui, sans-serif" }}>J</span>
            </div>
            <span style={{ color: "#9590b5", fontSize: 14, letterSpacing: "0.06em", fontFamily: "system-ui, sans-serif" }}>taruni-portfolio.vercel.app</span>
            <div style={{ display: "flex", marginLeft: "auto", background: "rgba(123,114,240,0.15)", border: "1px solid rgba(123,114,240,0.3)", borderRadius: 6, padding: "4px 10px" }}>
              <span style={{ color: "#7b72f0", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "system-ui, sans-serif" }}>BLOG POST</span>
            </div>
          </div>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center", paddingTop: 24, paddingBottom: 16 }}>
            <div style={{ display: "flex", fontSize: title.length > 60 ? 44 : title.length > 40 ? 52 : 58, fontWeight: 700, color: "#f0eeff", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 900 }}>
              {title}
            </div>
            {description && (
              <div style={{ display: "flex", fontSize: 18, color: "#9590b5", lineHeight: 1.5, maxWidth: 800, fontFamily: "system-ui, sans-serif" }}>
                {description.length > 120 ? description.slice(0, 120) + "…" : description}
              </div>
            )}
          </div>

          {/* Bottom */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {tags.map((tag) => (
                <div key={tag} style={{ background: "rgba(123,114,240,0.12)", border: "1px solid rgba(123,114,240,0.25)", borderRadius: 20, padding: "5px 12px", display: "flex" }}>
                  <span style={{ color: "#7b72f0", fontSize: 13, fontWeight: 600 }}>{`#${tag}`}</span>
                </div>
              ))}
              {readingTime && <span style={{ color: "#5e5a7e", fontSize: 13, marginLeft: 4 }}>{`${readingTime} min read`}</span>}
            </div>
            <span style={{ color: "#5e5a7e", fontSize: 13 }}>Taruni Nallamothu</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
