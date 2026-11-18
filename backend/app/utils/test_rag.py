
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Document, ProcessingStatus
from app.services.rag_service import answer_question


async def main():
    async with AsyncSessionLocal() as db:

        # Find a successfully processed document.
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

        question = (
            "What sections are included in the document outline?"
        )

        print("Testing complete RAG pipeline...")
        print("Document:", document.filename)
        print("Question:", question)

        response = await answer_question(
            query=question,
            user_id=document.user_id,
            db=db,
            document_ids=[document.id],
            top_k=5,
        )

        print("\n========== GENERATED ANSWER ==========")
        print(response["answer"])

        print("\n========== CITATIONS ==========")

        for citation in response["citations"]:
            print(
                f"[{citation['source_id']}] "
                f"{citation['filename']} | "
                f"Chunk {citation['chunk_index']} | "
                f"Page: {citation['page_number']} | "
                f"Slide: {citation['slide_number']}"
            )

        print("\n========== RESULTS ==========")
        print("Retrieved chunks:", response["retrieved_count"])
        print("Citations:", len(response["citations"]))
        print(
            "Insufficient evidence:",
            response["insufficient_evidence"],
        )

        print("\nRAG PIPELINE TEST COMPLETED")


if __name__ == "__main__":
    asyncio.run(main())
