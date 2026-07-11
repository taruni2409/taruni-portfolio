import experienceJson from "@/data/knowledge/experience.json";

export interface Experience {
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  description: string;
  bullets: string[];
  tech?: string;
}

export const experience = experienceJson as Experience[];
