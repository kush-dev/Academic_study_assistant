
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatSessionCreate(BaseModel):
    title: str = Field(
        default="New conversation",
        min_length=1,
        max_length=200,
    )
    document_ids: list[UUID] = Field(default_factory=list)


class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    document_ids: list[str] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatMessageRequest(BaseModel):
    session_id: UUID
    message: str = Field(min_length=1, max_length=10000)
    document_ids: list[UUID] | None = None


class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    citations: list[dict] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatAnswerResponse(BaseModel):
    session_id: UUID
    user_message_id: UUID
    assistant_message_id: UUID
    answer: str
    citations: list[dict]
    sources: list[dict]
    insufficient_evidence: bool
    retrieved_count: int
