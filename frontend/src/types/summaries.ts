
export type SummaryDetailLevel = "short" | "medium" | "detailed";

export interface SummaryGenerateRequest {
  document_id: string;
  detail_level: SummaryDetailLevel;
}

export interface SummaryCitation {
  source_id: string;
  document_id: string;
  filename: string;
  chunk_index: number;
  page_number: number | null;
  slide_number: number | null;
}

export interface SummaryResponse {
  document_id: string;
  filename: string;
  summary: string;
  citations: SummaryCitation[];
  retrieved_count: number;
}
