
import io

import pymupdf as fitz
from docx import Document as WordDocument
from pptx import Presentation
from pptx.util import Inches

from app.services.document_processor import process_document


def create_sample_pdf():
    pdf = fitz.open()

    for page_number in range(1, 4):
        page = pdf.new_page()

        words = [
            f"page{page_number} academic study content"
            for _ in range(220)
        ]

        page.insert_textbox(
            fitz.Rect(40, 40, 550, 750),
            " ".join(words),
            fontsize=9,
        )

    content = pdf.tobytes()
    pdf.close()

    return content


def create_sample_docx():
    document = WordDocument()

    document.add_heading(
        "Academic Study Sample",
        level=1,
    )

    for paragraph_number in range(10):
        words = [
            f"paragraph{paragraph_number} academic study material"
            for _ in range(120)
        ]

        document.add_paragraph(" ".join(words))

    output = io.BytesIO()
    document.save(output)

    return output.getvalue()


def create_sample_pptx():
    presentation = Presentation()

    slide = presentation.slides.add_slide(
        presentation.slide_layouts[6]
    )

    textbox = slide.shapes.add_textbox(
        Inches(0.5),
        Inches(0.5),
        Inches(9),
        Inches(6),
    )

    text_frame = textbox.text_frame

    text_frame.text = "Academic Study Sample"

    paragraph = text_frame.add_paragraph()

    paragraph.text = " ".join(
        f"academic study slide content item{number}"
        for number in range(1200)
    )

    output = io.BytesIO()
    presentation.save(output)

    return output.getvalue()


def test_format(file_type, content):
    print(f"\nTesting {file_type.upper()} extraction...")

    chunks = process_document(
        file_content=content,
        file_type=file_type,
    )

    assert len(chunks) > 0, "No chunks were generated."

    for expected_index, chunk in enumerate(chunks):
        assert chunk["chunk_index"] == expected_index
        assert 0 < chunk["token_count"] <= 500
        assert chunk["content"].strip()

    print("Chunks generated:", len(chunks))
    print("First chunk tokens:", chunks[0]["token_count"])
    print("Last chunk tokens:", chunks[-1]["token_count"])

    if file_type == "pdf":
        assert any(
            chunk["page_number"] is not None
            for chunk in chunks
        )
        print("PDF page metadata: SUCCESSFUL")

    elif file_type == "pptx":
        assert any(
            chunk["slide_number"] is not None
            for chunk in chunks
        )
        print("PowerPoint slide metadata: SUCCESSFUL")

    elif file_type == "docx":
        assert all(
            chunk["page_number"] is None
            and chunk["slide_number"] is None
            for chunk in chunks
        )
        print("Word document metadata: SUCCESSFUL")

    print(f"{file_type.upper()} PROCESSING SUCCESSFUL")


def main():
    test_format("pdf", create_sample_pdf())
    test_format("docx", create_sample_docx())
    test_format("pptx", create_sample_pptx())

    print("\nALL DOCUMENT PROCESSING TESTS PASSED")


if __name__ == "__main__":
    main()
