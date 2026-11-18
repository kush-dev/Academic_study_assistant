
import asyncio
import logging
import uuid

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Document, DocumentChunk, ProcessingStatus
from app.services.storage_service import download_file
from app.services.document_processor import process_document
from app.services.embedding_service import generate_embeddings
from app.services.vector_store import store_chunks, delete_chunks


logger = logging.getLogger(__name__)


async def process_document_background(
    document_id: uuid.UUID,
) -> None:
    """
    Process an uploaded document using an independent database session.

    Processing:
    1. Mark document as PROCESSING.
    2. Download original file.
    3. Extract text and create chunks.
    4. Generate embeddings.
    5. Store vectors in ChromaDB.
    6. Save chunk metadata in PostgreSQL.
    7. Mark document as COMPLETED.
    """

    chroma_ids: list[str] = []

    async with AsyncSessionLocal() as db:

        result = await db.execute(
            select(Document).where(
                Document.id == document_id
            )
        )

        document = result.scalar_one_or_none()

        if document is None:
            logger.warning(
                "Document %s was not found.",
                document_id,
            )
            return

        if document.processing_status == ProcessingStatus.COMPLETED:
            logger.info(
                "Document %s has already been processed.",
                document_id,
            )
            return

        if document.processing_status == ProcessingStatus.PROCESSING:
            logger.info(
                "Document %s is already being processed.",
                document_id,
            )
            return

        storage_path = document.storage_path
        file_type = document.file_type
        user_id = str(document.user_id)

        document.processing_status = ProcessingStatus.PROCESSING
        await db.commit()

        try:
            logger.info(
                "Starting ingestion for document %s.",
                document_id,
            )

            # 1. Download original file from Supabase.
            file_content = await download_file(storage_path)

            # 2. Extract text and generate chunks.
            chunks = process_document(
                file_content=file_content,
                file_type=file_type,
            )

            if not chunks:
                raise ValueError(
                    "No readable document chunks were generated."
                )

            texts = [
                chunk["content"]
                for chunk in chunks
            ]

            # 3. Generate embeddings without blocking the event loop.
            embeddings = await asyncio.to_thread(
                generate_embeddings,
                texts,
            )

            # 4. Generate unique ChromaDB IDs.
            chroma_ids = [
                str(uuid.uuid4())
                for _ in chunks
            ]

            # 5. Prepare ChromaDB metadata.
            metadatas = []

            for chunk in chunks:
                metadata = {
                    "user_id": user_id,
                    "document_id": str(document_id),
                    "chunk_index": chunk["chunk_index"],
                }

                if chunk.get("page_number") is not None:
                    metadata["page_number"] = chunk["page_number"]

                if chunk.get("slide_number") is not None:
                    metadata["slide_number"] = chunk["slide_number"]

                metadatas.append(metadata)

            # 6. Store embeddings and metadata in ChromaDB.
            await asyncio.to_thread(
                store_chunks,
                chroma_ids,
                texts,
                embeddings,
                metadatas,
            )

            # 7. Create PostgreSQL chunk records.
            database_chunks = []

            for chunk, chroma_id in zip(chunks, chroma_ids):
                database_chunks.append(
                    DocumentChunk(
                        document_id=document_id,
                        chunk_index=chunk["chunk_index"],
                        content=chunk["content"],
                        token_count=chunk["token_count"],
                        chroma_id=chroma_id,
                        page_number=chunk.get("page_number"),
                        slide_number=chunk.get("slide_number"),
                    )
                )

            db.add_all(database_chunks)

            # 8. Mark document as completed.
            document.processing_status = ProcessingStatus.COMPLETED

            await db.commit()

            logger.info(
                "Document %s processed successfully. "
                "%s chunks stored.",
                document_id,
                len(database_chunks),
            )

        except Exception:
            logger.exception(
                "Document ingestion failed for %s.",
                document_id,
            )

            await db.rollback()

            # Remove vectors if PostgreSQL processing failed.
            if chroma_ids:
                try:
                    await asyncio.to_thread(
                        delete_chunks,
                        chroma_ids,
                    )
                except Exception:
                    logger.exception(
                        "Failed to clean up ChromaDB vectors "
                        "for document %s.",
                        document_id,
                    )

            # Mark document as FAILED.
            try:
                failed_result = await db.execute(
                    select(Document).where(
                        Document.id == document_id
                    )
                )

                failed_document = failed_result.scalar_one_or_none()

                if failed_document is not None:
                    failed_document.processing_status = (
                        ProcessingStatus.FAILED
                    )
                    await db.commit()

            except Exception:
                await db.rollback()

                logger.exception(
                    "Could not update failure status "
                    "for document %s.",
                    document_id,
                )
