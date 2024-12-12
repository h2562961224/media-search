export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  images?: string[];
}

export interface SearchResponse {
  sources: Source[];
  summary: string;
  relatedQuestions: string[];
}

