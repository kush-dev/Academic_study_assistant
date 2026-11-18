
import io
from functools import lru_cache

import pymupdf
from docx import Document as WordDocument
from pptx import Presentation
from transformers import AutoTokenizer


EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
CHUNK_STRIDE = CHUNK_SIZE - CHUNK_OVERLAP


@lru_cache(maxsize=1)
def get_tokenizer():
    """
    Load the tokenizer once and reuse it.

    This downloads the tokenizer files the first time
    it is needed.
    """
    return AutoTokenizer.from_pretrained(
        EMBEDDING_MODEL,
        use_fast=True,
    )


def extract_pdf(file_content: bytes) -> list[dict]:
    """Extract text from each PDF page."""
    segments = []

    with pymupdf.open(stream=file_content, filetype="pdf") as pdf:
        if pdf.is_encrypted:
            raise ValueError("Password-protected PDFs are not supported.")

        for page_number, page in enumerate(pdf, start=1):
            text = page.get_text("text").strip()

            if text:
                segments.append({
                    "text": text,
                    "page_number": page_number,
                    "slide_number": None,
                })

    return segments


def extract_docx(file_content: bytes) -> list[dict]:
    """Extract paragraphs and table text from a Word document."""
    document = WordDocument(io.BytesIO(file_content))

    parts = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            parts.append(text)

    for table in document.tables:
        for row in table.rows:
            cells = [
                cell.text.strip()
                for cell in row.cells
                if cell.text.strip()
            ]

            if cells:
                parts.append(" | ".join(cells))

    combined_text = "\n".join(parts).strip()

    if not combined_text:
        return []

    return [{
        "text": combined_text,
        "page_number": None,
        "slide_number": None,
    }]


def extract_pptx(file_content: bytes) -> list[dict]:
    """Extract text from each PowerPoint slide."""
    presentation = Presentation(io.BytesIO(file_content))

    segments = []

    for slide_number, slide in enumerate(
        presentation.slides,
        start=1,
    ):
        parts = []

        for shape in slide.shapes:
            if shape.has_text_frame:
                text = shape.text.strip()

                if text:
                    parts.append(text)

            if shape.has_table:
                for row in shape.table.rows:
                    cells = [
                        cell.text.strip()
                        for cell in row.cells
                        if cell.text.strip()
                    ]

                    if cells:
                        parts.append(" | ".join(cells))

        slide_text = "\n".join(parts).strip()

        if slide_text:
            segments.append({
                "text": slide_text,
                "page_number": None,
                "slide_number": slide_number,
            })

    return segments


def extract_document_segments(
    file_content: bytes,
    file_type: str,
) -> list[dict]:
    """
    Extract document text while preserving page or slide metadata.
    """
    file_type = file_type.lower().lstrip(".")

    if not file_content:
        raise ValueError("The uploaded document is empty.")

    if file_type == "pdf":
        segments = extract_pdf(file_content)

    elif file_type == "docx":
        segments = extract_docx(file_content)

    elif file_type == "pptx":
        segments = extract_pptx(file_content)

    else:
        raise ValueError(
            "Unsupported file format. Use PDF, DOCX, or PPTX."
        )

    if not segments:
        raise ValueError(
            "No readable text was found in this document."
        )

    return segments


def chunk_document(
    segments: list[dict],
) -> list[dict]:
    """
    Split extracted text into 500-token chunks
    with 100-token overlap.

    Each chunk retains the source page or slide
    where the chunk begins.
    """
    if not segments:
        return []

    tokenizer = get_tokenizer()

    # Combine segments while tracking their original positions.
    combined_parts = []
    segment_positions = []
    current_position = 0

    for segment in segments:
        segment_text = segment["text"].strip()

        if not segment_text:
            continue

        if combined_parts:
            separator = "\n\n"
            combined_parts.append(separator)
            current_position += len(separator)

        start_position = current_position

        combined_parts.append(segment_text)
        current_position += len(segment_text)

        segment_positions.append({
            "start": start_position,
            "end": current_position,
            "page_number": segment.get("page_number"),
            "slide_number": segment.get("slide_number"),
        })

    combined_text = "".join(combined_parts)

    encoded = tokenizer(
        combined_text,
        add_special_tokens=False,
        return_offsets_mapping=True,
        truncation=False,
    )

    token_ids = encoded["input_ids"]
    offsets = encoded["offset_mapping"]

    chunks = []
    chunk_index = 0

    for start in range(
        0,
        len(token_ids),
        CHUNK_STRIDE,
    ):
        end = min(
            start + CHUNK_SIZE,
            len(token_ids),
        )

        chunk_token_ids = token_ids[start:end]

        if not chunk_token_ids:
            continue

        chunk_text = tokenizer.decode(
            chunk_token_ids,
            skip_special_tokens=True,
        ).strip()

        if not chunk_text:
            continue

        # Identify the source segment where this chunk begins.
        start_character = offsets[start][0]

        source_segment = next(
            (
                segment
                for segment in segment_positions
                if segment["start"] <= start_character < segment["end"]
            ),
            None,
        )

        if source_segment is None:
            page_number = None
            slide_number = None
        else:
            page_number = source_segment["page_number"]
            slide_number = source_segment["slide_number"]

        chunks.append({
            "chunk_index": chunk_index,
            "content": chunk_text,
            "token_count": len(chunk_token_ids),
            "page_number": page_number,
            "slide_number": slide_number,
        })

        chunk_index += 1

        # Stop once the final tokens have been processed.
        if end == len(token_ids):
            break

    return chunks


def process_document(
    file_content: bytes,
    file_type: str,
) -> list[dict]:
    """
    Complete extraction and chunking operation.
    """
    segments = extract_document_segments(
        file_content=file_content,
        file_type=file_type,
    )

    return chunk_document(segments)
