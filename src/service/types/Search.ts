import { Source } from "../../platform/PlatformRegister";

export interface SearchRequest{
  q: string;
  platform?: string;
}

export interface SearchResponse {
  sources: Source[];
  summary: string;
  relatedQuestions: string[];
}