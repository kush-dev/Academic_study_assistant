import api from "./client";
import type {
  SummaryGenerateRequest,
  SummaryResponse,
} from "../types/summaries";

export async function generateSummary(
  data: SummaryGenerateRequest
): Promise<SummaryResponse> {
  const response = await api.post("/summaries/generate", data);
  return response.data;
}
