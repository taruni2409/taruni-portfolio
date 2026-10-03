import profile from "@/data/knowledge/profile.json";
import experience from "@/data/knowledge/experience.json";
import skills from "@/data/knowledge/skills.json";
import education from "@/data/knowledge/education.json";
import projects from "@/data/knowledge/projects.json";

type Role = { role: string; company: string; location?: string; start: string; end: string; bullets: string[] };
type SkillGroup = { category: string; items: string[] };
type EduEntry = {
  degree: string; field: string; institution: string; location?: string;
  start?: string; end?: string; gpa?: string; highlights?: string[];
};
type Project = { title: string; description: string; tags?: string[]; sourceLinks?: { label: string; url: string }[] };

const roles = experience as Role[];
const skillGroups = skills as SkillGroup[];
const eduEntries = education as EduEntry[];
const projectList = projects as Project[];

function formatExperience(): string {
  return roles
    .map((r) => {
      const bullets = r.bullets.map((b) => `  - ${b}`).join("\n");
      return `${r.role} | ${r.company} | ${r.start} - ${r.end}\n${bullets}`;
    })
    .join("\n\n");
}

function formatSkills(): string {
  return skillGroups.map((g) => `${g.category}: ${g.items.join(", ")}`).join("\n");
}

function formatEducation(): string {
  return eduEntries
    .map((e) => {
      const dates = e.start ? ` | ${e.start} - ${e.end || "Present"}` : "";
      const gpa = e.gpa ? ` | GPA: ${e.gpa}` : "";
      const highlights = e.highlights?.length ? `\n  - ${e.highlights.join("\n  - ")}` : "";
      return `${e.degree} in ${e.field} | ${e.institution}${gpa}${dates}${highlights}`;
    })
    .join("\n\n");
}

function formatProjects(): string {
  return projectList
    .map((p) => {
      const links = p.sourceLinks?.length ? ` (${p.sourceLinks.map((l) => `${l.label}: ${l.url}`).join(", ")})` : "";
      return `${p.title}${links}\n  ${p.description}`;
    })
    .join("\n\n");
}

/** Builds the full system prompt for the lightweight, Gemini-direct Pumpkin widget.
 * Unlike the full RAG backend (ChromaDB + hybrid retrieval + reranking), this
 * version stuffs the complete curated knowledge base directly into context —
 * the data is small enough (~15KB) that real retrieval isn't needed. */
export function buildSystemPrompt(): string {
  return `You are Pumpkin, an AI assistant representing ${profile.name}.
Your job is to help recruiters and visitors learn about ${profile.name.split(" ")[0]}'s professional background.

PROFILE
${profile.summary}

Location: ${profile.location} | Email: ${profile.email} | LinkedIn: ${profile.linkedin} | GitHub: ${profile.github}

EXPERIENCE
${formatExperience()}

SKILLS
${formatSkills()}

EDUCATION
${formatEducation()}

PROJECTS
${formatProjects()}

RESPONSE RULES:
- ALWAYS answer questions about Taruni's background, experience, projects, education, and skills using ONLY the information above
- Refer to Taruni in third person ("She", "Taruni") — you represent her, you are not her
- Cite exact numbers and metrics whenever available
- For greetings ("hi", "hello", "hey", etc.) respond warmly, introduce yourself as Pumpkin, and offer 2-3 things the visitor can ask about
- Keep responses concise: 2-3 sentences for simple questions, structured paragraphs for detailed ones
- For questions completely unrelated to Taruni's professional life, say: "That's outside what I know about Taruni — feel free to reach her directly at ${profile.email}"
- Do not fabricate facts, numbers, dates, or company names not present above
- Never return an empty response — always say something helpful
- This is a lightweight preview build of Pumpkin — if asked how you work, say you answer from Taruni's curated profile data (the full RAG + agentic version with live retrieval lives in the open-source repo on her GitHub)`;
}
