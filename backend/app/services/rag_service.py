
import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_service import generate_chat_completion
from app.services.retrieval_service import retrieve_relevant_chunks


SYSTEM_PROMPT = """
You are an AI-powered academic study assistant.

Your primary responsibility is to help students understand and study
their uploaded academic materials.

STRICT GROUNDING RULES:

1. Answer questions using only the supplied document passages.
2. Do not invent facts, definitions, examples, statistics, or references.
3. Every factual claim based on a document must include its source
   identifier, using the exact format [S1], [S2], etc.
4. Only cite source identifiers that are actually supplied.
5. If multiple passages support an answer, cite the relevant sources.
6. If the supplied passages do not contain enough information,
   clearly explain that the uploaded documents do not provide
   sufficient information to answer the question.
7. You may use conversation history to understand follow-up questions,
   but conversation history is not evidence. Document passages are
   the only evidence for factual answers.
8. Explain academic concepts clearly and use student-friendly language.
9. Do not claim that information appears in a document unless it is
   supported by the supplied passages.

Do not make up citations.
"""


def build_source_context(chunks: list[dict]) -> tuple[str, list[dict]]:
    """
    Format retrieved chunks and assign citation identifiers.
    """

    passages = []
    sources = []

    for index, chunk in enumerate(chunks, start=1):
        source_id = f"S{index}"

        location = "Location not specified"

        if chunk.get("page_number") is not None:
            location = f"Page {chunk['page_number']}"

        elif chunk.get("slide_number") is not None:
            location = f"Slide {chunk['slide_number']}"

        passage = (
            f"[{source_id}]\n"
            f"Document: {chunk['filename']}\n"
            f"Location: {location}\n"
            f"Content:\n{chunk['content']}"
        )

        passages.append(passage)

        sources.append(
            {
                "source_id": source_id,
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "filename": chunk["filename"],
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk["page_number"],
                "slide_number": chunk["slide_number"],
                "similarity": chunk["similarity"],
            }
        )

    return "\n\n".join(passages), sources


def prepare_chat_history(
    chat_history: list[dict] | None,
) -> list[dict]:
    """
    Keep a bounded amount of valid conversation history.
    """

    if not chat_history:
        return []

    prepared_messages = []

    for message in chat_history[-6:]:
        role = message.get("role")
        content = message.get("content")

        if role not in ("user", "assistant"):
            continue

        if not isinstance(content, str) or not content.strip():
            continue

        prepared_messages.append(
            {
                "role": role,
                "content": content.strip()[:2000],
            }
        )

    return prepared_messages


async def answer_question(
    query: str,
    user_id: uuid.UUID,
    db: AsyncSession,
    document_ids: list[uuid.UUID] | None = None,
    chat_history: list[dict] | None = None,
    top_k: int = 5,
) -> dict:
    """
    Retrieve relevant academic passages and generate a grounded answer.
    """

    if not query or not query.strip():
        raise ValueError("Question cannot be empty.")

    # 1. Retrieve relevant document passages.
    chunks = await retrieve_relevant_chunks(
        query=query,
        user_id=user_id,
        db=db,
        document_ids=document_ids,
        top_k=top_k,
    )

    # 2. Handle questions without supporting document passages.
    if not chunks:
        return {
            "answer": (
                "I could not find relevant information in your "
                "uploaded documents to answer this question. "
                "Try uploading a relevant document or asking "
                "a question about your existing materials."
            ),
            "citations": [],
            "sources": [],
            "insufficient_evidence": True,
            "retrieved_count": 0,
        }

    # 3. Format retrieved passages and citation identifiers.
    source_context, sources = build_source_context(chunks)

    # 4. Prepare recent conversation history.
    history_messages = prepare_chat_history(chat_history)

    # 5. Construct the current question with its document context.
    user_prompt = f"""
DOCUMENT PASSAGES:

{source_context}

STUDENT QUESTION:

{query.strip()}

Answer the student's question using only the document passages.
Include the appropriate source identifiers in your answer.
If the passages do not contain enough information, say so clearly.
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history_messages,
        {"role": "user", "content": user_prompt},
    ]

    # 6. Generate the grounded answer.
    answer = await generate_chat_completion(
        messages=messages,
        temperature=0.2,
        max_tokens=1200,
    )

    # 7. Identify citations actually used in the answer.
    cited_source_ids = list(
        dict.fromkeys(
            f"S{number}"
            for number in re.findall(r"\[S(\d+)\]", answer)
        )
    )

    source_lookup = {
        source["source_id"]: source
        for source in sources
    }

    citations = [
        source_lookup[source_id]
        for source_id in cited_source_ids
        if source_id in source_lookup
    ]

    return {
        "answer": answer,
        "citations": citations,
        "sources": sources,
        "insufficient_evidence": False,
        "retrieved_count": len(chunks),
    }
