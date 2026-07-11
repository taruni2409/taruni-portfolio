import testimonialsJson from "@/data/knowledge/testimonials.json";

export interface Testimonial {
  name: string;
  designation: string;
  company: string;
  linkedin: string;
  description: string;
  givenAt: string;
  source: string;
}

export const testimonials = testimonialsJson as Testimonial[];
