
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Document, ProcessingStatus
from app.services.retrieval_service import retrieve_relevant_chunks


async def main():
    async with AsyncSessionLocal() as db:

        # Find one successfully processed document.
        result = await db.execute(
            select(Document)
            .where(
                Document.processing_status == ProcessingStatus.COMPLETED
            )
            .limit(1)
        )

        document = result.scalar_one_or_none()

        if document is None:
            print("No completed documents found.")
            return

        print("Testing retrieval...")
        print("Document:", document.filename)

        chunks = await retrieve_relevant_chunks(
            query="What are the main topics discussed in this document?",
            user_id=document.user_id,
            db=db,
            document_ids=[document.id],
            top_k=5,
        )

        print("\nRetrieved chunks:", len(chunks))

        for index, chunk in enumerate(chunks, start=1):
            print(f"\n--- Result {index} ---")
            print("Filename:", chunk["filename"])
            print("Chunk index:", chunk["chunk_index"])
            print("Page:", chunk["page_number"])
            print("Slide:", chunk["slide_number"])
            print("Similarity:", chunk["similarity"])
            print("Content:", chunk["content"][:300])

        if chunks:
            print("\nRAG RETRIEVAL TEST PASSED")
        else:
            print("\nNo matching chunks were returned.")


if __name__ == "__main__":
    asyncio.run(main())
