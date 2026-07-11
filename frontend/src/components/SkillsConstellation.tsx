"use client";

import { useMemo, useState } from "react";
import { projects } from "@/data/projects";
import { experience } from "@/data/experience";

function projectName(title: string): string {
  return title.split(/[–—(]| - /)[0].trim();
}

function shortCompany(company: string): string {
  const base = company.split(/[–(]/)[0].trim();
  return base.length > 22 ? base.slice(0, 21) + "…" : base;
}

const norm = (s: string) => s.toLowerCase().trim();

const SKILL_X = 270;
const NODE_X = 730;
const ROW = 40;
const PAD = 44;

type RightNode = {
  id: string;
  label: string;
  kind: "project" | "experience";
  award: boolean;
  skills: string[]; // normalized
};

export default function SkillsConstellation() {
  const [hoverSkill, setHoverSkill] = useState<string | null>(null);
  const [hoverNode, setHoverNode]   = useState<string | null>(null);

  const { skillNodes, nodeNodes, edges, height } = useMemo(() => {
    // Right-side items: every project + every work-experience entry, with their
    // attached skills (project.tags ∪ experience.tech). Edit those in admin → this updates.
    const rights: RightNode[] = [
      ...projects.map((p, i): RightNode => ({
        id: `proj-${i}`,
        label: projectName(p.title),
        kind: "project",
        award: !!p.award,
        skills: p.tags.map(norm).filter(Boolean),
      })),
      ...experience.map((e, i): RightNode => ({
        id: `exp-${i}`,
        label: `${e.role} · ${shortCompany(e.company)}`,
        kind: "experience",
        award: false,
        skills: (e.tech || "").split(",").map(norm).filter(Boolean),
      })),
    ];

    // Union of skills → which right-nodes use each (keep first-seen display casing)
    const display = new Map<string, string>();
    const skillToNodes = new Map<string, string[]>();
    for (const r of rights) {
      const seen = new Set<string>();
      for (const sk of r.skills) {
        if (seen.has(sk)) continue;
        seen.add(sk);
        if (!display.has(sk)) {
          // recover an original-cased version
          const orig = [...projects.flatMap((p) => p.tags), ...experience.flatMap((e) => (e.tech || "").split(","))]
            .map((t) => t.trim()).find((t) => norm(t) === sk) ?? sk;
          display.set(sk, orig);
        }
        if (!skillToNodes.has(sk)) skillToNodes.set(sk, []);
        skillToNodes.get(sk)!.push(r.id);
      }
    }

    // Keep cross-cutting skills (used by ≥2 items), top 14 by connection count
    const topSkills = [...skillToNodes.entries()]
      .filter(([, ns]) => ns.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 14);
    const shownSkillKeys = new Set(topSkills.map(([k]) => k));

    // Only show right-nodes that connect to a shown skill
    const shownRights = rights.filter((r) => r.skills.some((s) => shownSkillKeys.has(s)));

    const rows = Math.max(topSkills.length, shownRights.length);
    const h = rows * ROW + PAD * 2;

    const skillNodes = topSkills.map(([key, ns], i) => ({
      key, label: display.get(key) ?? key, nodeIds: ns,
      x: SKILL_X, y: PAD + (i + 0.5) * ((h - PAD * 2) / topSkills.length),
    }));
    const nodeNodes = shownRights.map((r, i) => ({
      ...r, x: NODE_X, y: PAD + (i + 0.5) * ((h - PAD * 2) / shownRights.length),
    }));

    const edges: { skill: string; node: string; d: string }[] = [];
    for (const s of skillNodes) {
      for (const nid of s.nodeIds) {
        const n = nodeNodes.find((nn) => nn.id === nid);
        if (!n) continue;
        const mx = (s.x + n.x) / 2;
        edges.push({ skill: s.key, node: nid, d: `M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${n.y}, ${n.x} ${n.y}` });
      }
    }
    return { skillNodes, nodeNodes, edges, height: h };
  }, []);

  const anyHover = !!(hoverSkill || hoverNode);
  const edgeOn = (e: { skill: string; node: string }) =>
    (hoverSkill && e.skill === hoverSkill) || (hoverNode && e.node === hoverNode);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 1000 ${height}`} className="w-full h-auto" style={{ maxHeight: height }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const on = edgeOn(e);
          return (
            <path key={i} d={e.d} fill="none"
              stroke={on ? "rgb(99 102 241)" : "currentColor"}
              strokeWidth={on ? 1.6 : 1} className="text-border"
              style={{ opacity: anyHover ? (on ? 0.9 : 0.05) : 0.16, transition: "opacity 0.25s ease, stroke-width 0.25s ease" }} />
          );
        })}

        {/* Skill nodes (left) */}
        {skillNodes.map((s) => {
          const on = hoverSkill === s.key || (hoverNode && s.nodeIds.includes(hoverNode));
          const dim = anyHover && !on;
          return (
            <g key={s.key} transform={`translate(${s.x}, ${s.y})`}
              onMouseEnter={() => setHoverSkill(s.key)} onMouseLeave={() => setHoverSkill(null)}
              style={{ cursor: "default", opacity: dim ? 0.3 : 1, transition: "opacity 0.25s ease" }}>
              <circle r={on ? 5 : 3.5} fill={on ? "rgb(99 102 241)" : "currentColor"} className="text-fg-faint" style={{ transition: "all 0.2s ease" }} />
              <text x={-12} y={4} textAnchor="end" className={`text-[12.5px] font-medium ${on ? "fill-accent" : "fill-fg-muted"}`} style={{ transition: "fill 0.2s ease" }}>
                {s.label}
              </text>
            </g>
          );
        })}

        {/* Project + experience nodes (right) */}
        {nodeNodes.map((n) => {
          const on = hoverNode === n.id || (hoverSkill && skillNodes.find((s) => s.key === hoverSkill)?.nodeIds.includes(n.id));
          const dim = anyHover && !on;
          const dot = on ? (n.award ? "rgb(245 158 11)" : n.kind === "experience" ? "rgb(99 102 241)" : "rgb(139 92 246)") : "currentColor";
          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}
              onMouseEnter={() => setHoverNode(n.id)} onMouseLeave={() => setHoverNode(null)}
              style={{ cursor: "default", opacity: dim ? 0.3 : 1, transition: "opacity 0.25s ease" }}>
              <circle r={on ? 5 : 3.5} fill={dot} className="text-fg-faint" style={{ transition: "all 0.2s ease" }} />
              <text x={12} y={4} textAnchor="start" className={`text-[12.5px] font-medium ${on ? "fill-fg" : "fill-fg-muted"}`} style={{ transition: "fill 0.2s ease" }}>
                {n.label}{n.award ? " ★" : ""}
              </text>
            </g>
          );
        })}

        {/* Captions */}
        <text x={SKILL_X} y={22} textAnchor="end" className="fill-fg-faint text-[10px] font-bold uppercase tracking-widest">Skills</text>
        <text x={NODE_X} y={22} textAnchor="start" className="fill-fg-faint text-[10px] font-bold uppercase tracking-widest">Projects &amp; Roles</text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-fg-faint">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent/60" /> Project</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> Experience</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Award ★</span>
        <span>· hover a skill to see where it&apos;s been used</span>
      </div>
    </div>
  );
}
