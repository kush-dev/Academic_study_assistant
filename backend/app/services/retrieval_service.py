
import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, DocumentChunk, ProcessingStatus
from app.services.embedding_service import generate_query_embedding
from app.services.vector_store import search_chunks


async def retrieve_relevant_chunks(
    query: str,
    user_id: uuid.UUID,
    db: AsyncSession,
    document_ids: list[uuid.UUID] | None = None,
    top_k: int = 5,
) -> list[dict]:
    """
    Retrieve the most relevant document chunks for a user's question.

    Retrieval is restricted to documents owned by the authenticated user
    and whose processing status is COMPLETED.
    """

    # 1. Validate the question and retrieval limit.
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty.")

    if top_k < 1 or top_k > 20:
        raise ValueError("top_k must be between 1 and 20.")

    # 2. If document IDs were supplied, verify which ones
    # belong to this user and have completed processing.
    allowed_document_ids = None

    if document_ids is not None:
        document_result = await db.execute(
            select(Document.id).where(
                Document.id.in_(document_ids),
                Document.user_id == user_id,
                Document.processing_status == ProcessingStatus.COMPLETED,
            )
        )

        allowed_document_ids = document_result.scalars().all()

        # Do not search if none of the selected documents
        # are available to this user.
        if not allowed_document_ids:
            return []

    # 3. Convert the question into an embedding.
    query_embedding = await asyncio.to_thread(
        generate_query_embedding,
        query.strip(),
    )

    # 4. Search ChromaDB with tenant filtering.
    chroma_results = await asyncio.to_thread(
        search_chunks,
        query_embedding,
        str(user_id),
        (
            [str(document_id) for document_id in allowed_document_ids]
            if allowed_document_ids is not None
            else None
        ),
        top_k,
    )

    result_ids = chroma_results.get("ids", [[]])[0]
    distances = chroma_results.get("distances", [[]])[0]

    if not result_ids:
        return []

    # 5. Retrieve the matching chunk records and document names
    # from PostgreSQL, applying user ownership checks again.
    database_result = await db.execute(
        select(DocumentChunk, Document.filename)
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(
            DocumentChunk.chroma_id.in_(result_ids),
            Document.user_id == user_id,
            Document.processing_status == ProcessingStatus.COMPLETED,
        )
    )

    rows = database_result.all()

    # Map database records by their ChromaDB IDs.
    chunks_by_chroma_id = {
        chunk.chroma_id: (chunk, filename)
        for chunk, filename in rows
    }

    # 6. Preserve ChromaDB's similarity ranking.
    retrieved_chunks = []

    for chroma_id, distance in zip(result_ids, distances):
        database_record = chunks_by_chroma_id.get(chroma_id)

        # Ignore any vector without a matching authorized
        # PostgreSQL record.
        if database_record is None:
            continue

        chunk, filename = database_record

        # ChromaDB cosine distance = 1 - cosine similarity.
        similarity = 1.0 - float(distance)

        retrieved_chunks.append(
            {
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "filename": filename,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "token_count": chunk.token_count,
                "page_number": chunk.page_number,
                "slide_number": chunk.slide_number,
                "similarity": round(similarity, 4),
            }
        )

    return retrieved_chunks
