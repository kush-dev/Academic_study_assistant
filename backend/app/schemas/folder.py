
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class FolderResponse(BaseModel):
    id: UUID
    name: str
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
