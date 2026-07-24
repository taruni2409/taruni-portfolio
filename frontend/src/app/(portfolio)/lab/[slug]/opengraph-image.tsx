import { ImageResponse } from "next/og";
import { getLabEntryBySlug, getAllLabSlugs } from "@/lib/lab";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllLabSlugs().map((slug) => ({ slug }));
}
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  active:  { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", text: "#34d399", label: "ACTIVE" },
  paused:  { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", text: "#fbbf24", label: "PAUSED" },
  shipped: { bg: "rgba(123,114,240,0.12)", border: "rgba(123,114,240,0.3)", text: "#7b72f0", label: "SHIPPED" },
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getLabEntryBySlug(slug);

  const title       = entry?.title       ?? slug;
  const description = entry?.description ?? "";
  const tech        = (entry?.tech ?? []).slice(0, 4);
  const status      = entry?.status ?? "active";
  const sc          = STATUS_COLORS[status] ?? STATUS_COLORS.active;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: "#0c0a14", display: "flex", flexDirection: "column", position: "relative", fontFamily: "Georgia, 'Times New Roman', serif", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 60% 100%, rgba(52,211,153,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "linear-gradient(to bottom, #34d399, #059669)" }} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 72px 52px 78px", justifyContent: "space-between" }}>
          {/* Top */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "system-ui, sans-serif" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>J</span>
            </div>
            <span style={{ color: "#9590b5", fontSize: 14, letterSpacing: "0.06em" }}>taruni-portfolio.vercel.app</span>
            <div style={{ marginLeft: "auto", background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.text }} />
              <span style={{ color: sc.text, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>{sc.label}</span>
            </div>
          </div>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center", paddingTop: 24, paddingBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#34d399", fontWeight: 600, letterSpacing: "0.1em", fontFamily: "system-ui, sans-serif" }}>Lab · Building in public</div>
            <div style={{ fontSize: title.length > 50 ? 48 : 58, fontWeight: 700, color: "#f0eeff", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 900 }}>
              {title}
            </div>
            {description && (
              <div style={{ fontSize: 18, color: "#9590b5", lineHeight: 1.5, maxWidth: 800, fontFamily: "system-ui, sans-serif" }}>
                {description.length > 120 ? description.slice(0, 120) + "…" : description}
              </div>
            )}
          </div>

          {/* Bottom */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {tech.map((t) => (
                <div key={t} style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 20, padding: "5px 12px", display: "flex" }}>
                  <span style={{ color: "#34d399", fontSize: 13, fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>
            <span style={{ color: "#5e5a7e", fontSize: 13 }}>Taruni Nallamothu</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
