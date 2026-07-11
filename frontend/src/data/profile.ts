import profileJson from "@/data/knowledge/profile.json";

export interface Availability {
  open: boolean;
  label: string;
  types: string[];
  locations: string[];
}

export interface HeroStat {
  value: number;
  suffix: string;
  label: string;
  sub: string;
}

export interface NowBlock {
  building: string;
  learning: string;
  reading: string;
  location: string;
  updated: string;
}

export interface Profile {
  name: string;
  tagline: string;
  bio: string;
  summary: string;
  obsession: string;
  previous: string;
  prev_domain: string;
  interested_domain: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  resume: string;
  booking_url?: string;
  page_experience?: string;
  page_education?: string;
  page_projects?: string;
  contact_description?: string;
  page_blog?: string;
  page_lab?: string;
  page_gallery?: string;
  page_quotes?: string;
  currently?: string;
  now?: NowBlock;
  availability?: Availability;
  heroStats?: HeroStat[];
}

export const profile = profileJson as Profile;
