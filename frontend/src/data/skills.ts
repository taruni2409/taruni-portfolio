import skillsJson from "@/data/knowledge/skills.json";

export interface SkillGroup {
  category: string;
  items: string[];
}

export const skills = skillsJson as SkillGroup[];
