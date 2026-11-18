
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FlashcardGenerateRequest(BaseModel):
    document_id: UUID
    count: int = Field(default=10, ge=1, le=30)


class FlashcardResponse(BaseModel):
    id: UUID
    deck_id: UUID
    front: str
    back: str
    difficulty: str

    model_config = ConfigDict(from_attributes=True)


class FlashcardDeckResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str
    created_at: datetime
    flashcards: list[FlashcardResponse]

    model_config = ConfigDict(from_attributes=True)
