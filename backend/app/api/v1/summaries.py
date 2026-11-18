
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import Document, ProcessingStatus, User
from app.schemas.summary import (
    SummaryGenerateRequest,
    SummaryGenerateResponse,
)
from app.services.retrieval_service import retrieve_relevant_chunks
from app.services.summary_service import generate_document_summary


router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.post(
    "/generate",
    response_model=SummaryGenerateResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_summary(
    payload: SummaryGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify that the document belongs to the current user.
    result = await db.execute(
        select(Document).where(
            Document.id == payload.document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    if document.processing_status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The document has not finished processing.",
        )

    try:
        # 2. Retrieve relevant passages from this document only.
        passages = await retrieve_relevant_chunks(
            query=(
                "Identify the main topics, key concepts, important facts, "
                "definitions, explanations, and conclusions in this document."
            ),
            user_id=str(current_user.id),
            db=db,
            document_ids=[payload.document_id],
            top_k=10,
        )

        if not passages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No readable content was found for summarization.",
            )

        # 3. Generate the summary.
        summary, citations = await generate_document_summary(
            passages=passages,
            detail_level=payload.detail_level,
        )

        return SummaryGenerateResponse(
            document_id=document.id,
            filename=document.filename,
            summary=summary,
            citations=citations,
            retrieved_count=len(passages),
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Summary generation failed: {str(exc)[:300]}",
        ) from exc
