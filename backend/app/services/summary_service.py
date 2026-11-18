
import re

from app.services.llm_service import generate_chat_completion


DETAIL_INSTRUCTIONS = {
    "short": "Write a concise summary in approximately 1-2 paragraphs.",
    "medium": "Write a well-organized summary with the main ideas, important facts, and key concepts.",
    "detailed": (
        "Write a comprehensive summary using clear headings. "
        "Cover the major topics, important facts, definitions, "
        "examples, and conclusions found in the source material."
    ),
}


async def generate_document_summary(
    passages: list[dict],
    detail_level: str = "medium",
) -> tuple[str, list[dict]]:
    if not passages:
        raise ValueError("No document passages were provided.")

    source_blocks = []
    citations = []

    for index, passage in enumerate(passages, start=1):
        source_id = f"S{index}"

        filename = passage.get("filename", "Unknown document")
        chunk_index = passage.get("chunk_index", 0)
        page_number = passage.get("page_number")
        slide_number = passage.get("slide_number")
        content = passage.get("content", "")

        if not content.strip():
            continue

        source_blocks.append(
            f"[{source_id}] {filename} | "
            f"Chunk {chunk_index} | "
            f"Page {page_number} | "
            f"Slide {slide_number}\n"
            f"{content}"
        )

        citations.append(
            {
                "source_id": source_id,
                "document_id": str(passage.get("document_id", "")),
                "filename": filename,
                "chunk_index": chunk_index,
                "page_number": page_number,
                "slide_number": slide_number,
            }
        )

    if not source_blocks:
        raise ValueError("The retrieved document passages contain no usable text.")

    instructions = DETAIL_INSTRUCTIONS.get(
        detail_level,
        DETAIL_INSTRUCTIONS["medium"],
    )

    system_prompt = """
You are an academic study assistant.

Generate a clear, accurate summary using ONLY the supplied document passages.

Rules:
1. Do not introduce outside information.
2. Do not invent facts, definitions, examples, or conclusions.
3. Organize the summary logically.
4. Preserve important names, dates, terms, and concepts.
5. If the source does not provide enough information for a topic,
   do not invent missing details.
6. Add source citations such as [S1] after relevant statements.
7. Do not list information that is not supported by the passages.
"""

    user_prompt = f"""
Summarize the following academic document.

Detail level:
{instructions}

DOCUMENT PASSAGES:
{chr(10).join(source_blocks)}

Write the summary now, using source citations.
"""

    summary = await generate_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=2200,
    )

    summary = summary.strip()

    if not summary:
        raise ValueError("The AI returned an empty summary.")

    # Keep only citations actually referenced in the summary.
    used_ids = set(re.findall(r"\[(S\d+)\]", summary))
    used_citations = [
        citation
        for citation in citations
        if citation["source_id"] in used_ids
    ]

    return summary, used_citations
