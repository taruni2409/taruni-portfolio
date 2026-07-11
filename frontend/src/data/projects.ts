import projectsJson from "@/data/knowledge/projects.json";

export interface SourceLink {
  label: string;
  url: string;
}

export interface Project {
  title: string;
  description: string;
  tags: string[];
  featured: boolean;
  award?: string;
  sourceLinks: SourceLink[];
  note?: string;
}

export const projects = projectsJson as Project[];
