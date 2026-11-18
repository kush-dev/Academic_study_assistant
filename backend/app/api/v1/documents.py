import uuid
from pathlib import Path
import asyncio

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import (
    Document,
    DocumentChunk,
    Folder,
    ProcessingStatus,
    User,
)
from app.schemas.document import DocumentResponse
from app.services.storage_service import upload_file, delete_file
from app.services.vector_store import delete_chunks
from app.services.ingestion_service import process_document_background


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".docx": (
        "application/vnd.openxmlformats-officedocument."
        "wordprocessingml.document"
    ),
    ".pptx": (
        "application/vnd.openxmlformats-officedocument."
        "presentationml.presentation"
    ),
}

MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: uuid.UUID | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    original_filename = Path(file.filename or "").name.strip()

    if not original_filename:
        raise HTTPException(
            status_code=400,
            detail="A valid filename is required.",
        )

    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Only PDF, DOCX, and PPTX files are supported.",
        )

    if file.content_type not in (
        ALLOWED_EXTENSIONS[extension],
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=415,
            detail="The uploaded file content type does not match its extension.",
        )

    if folder_id is not None:
        folder_result = await db.execute(
            select(Folder).where(
                Folder.id == folder_id,
                Folder.user_id == current_user.id,
            )
        )

        if folder_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=404,
                detail="Folder not found.",
            )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size exceeds the "
                f"{settings.MAX_UPLOAD_SIZE_MB} MB limit."
            ),
        )

    document_id = uuid.uuid4()

    storage_path = (
        f"{current_user.id}/{document_id}/{original_filename}"
    )

    content_type = ALLOWED_EXTENSIONS[extension]

    document = Document(
        id=document_id,
        user_id=current_user.id,
        folder_id=folder_id,
        filename=original_filename,
        file_type=extension.lstrip("."),
        file_size=len(content),
        storage_path=storage_path,
        processing_status=ProcessingStatus.PENDING,
    )

    uploaded_to_storage = False

    try:
        await upload_file(
            storage_path=storage_path,
            file_content=content,
            content_type=content_type,
        )

        uploaded_to_storage = True

        db.add(document)
        await db.commit()
        await db.refresh(document)

    except Exception:
        await db.rollback()

        if uploaded_to_storage:
            try:
                await delete_file(storage_path)
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail="Document upload failed. Please try again.",
        )

    finally:
        await file.close()

    # Start ingestion after the upload response is prepared.
    background_tasks.add_task(
        process_document_background,
        document.id,
    )

    return document


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return document


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )

    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    chunk_result = await db.execute(
        select(DocumentChunk).where(
            DocumentChunk.document_id == document_id
        )
    )

    chunks = chunk_result.scalars().all()

    chroma_ids = [
        chunk.chroma_id
        for chunk in chunks
        if chunk.chroma_id
    ]

    try:
        await delete_file(document.storage_path)

        await asyncio.to_thread(
            delete_chunks,
            chroma_ids,
        )
        await db.delete(document)
        await db.commit()

    except Exception:
        await db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Document deletion failed. Please try again.",
        )

    return {
        "message": "Document deleted successfully.",
        "document_id": str(document_id),
    }
