import educationJson from "@/data/knowledge/education.json";

export interface Education {
  institution: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  start: string;
  end: string;
  gpa?: string;
  highlights?: string[];
}

export const education = educationJson as Education[];
