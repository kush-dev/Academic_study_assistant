
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class SummaryGenerateRequest(BaseModel):
    document_id: UUID
    detail_level: Literal["short", "medium", "detailed"] = "medium"


class SummaryCitation(BaseModel):
    source_id: str
    document_id: str
    filename: str
    chunk_index: int
    page_number: int | None = None
    slide_number: int | None = None


class SummaryGenerateResponse(BaseModel):
    document_id: UUID
    filename: str
    summary: str
    citations: list[SummaryCitation]
    retrieved_count: int
