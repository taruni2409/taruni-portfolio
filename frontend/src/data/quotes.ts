import quotesJson from "@/data/knowledge/quotes.json";

export type QuoteCategory = "Work" | "Life" | "Technology" | "Philosophy" | "Creativity" | "Mindset";

export interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string | null;
  category: QuoteCategory;
  favorite: boolean;
  featured?: boolean;
  addedAt: string;
}

export const quotes = quotesJson as Quote[];
