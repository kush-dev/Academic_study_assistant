from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    folder_id: UUID | None
    processing_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
