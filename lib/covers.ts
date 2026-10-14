import "server-only";
import sources from "@/data/cover-sources.json";

interface Cover {
  url: string;
  source_url: string;
  source: string;
  matched_isbn: string;
}

export function coverForIsbn(isbn: string | null): Cover | null {
  if (!isbn) return null;
  return (sources.covers as Record<string, Cover>)[isbn.replace(/[^0-9X]/gi, "")] ?? null;
}
