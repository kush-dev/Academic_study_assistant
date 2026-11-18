
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import (
    Document,
    Flashcard,
    FlashcardDeck,
    ProcessingStatus,
    User,
)
from app.schemas.flashcard import (
    FlashcardGenerateRequest,
    FlashcardDeckResponse,
)
from app.services.flashcard_service import generate_flashcards
from app.services.retrieval_service import retrieve_relevant_chunks
from app.models import Document, FlashcardDeck, Flashcard
from app.schemas.flashcard import (
    FlashcardDeckResponse,
    FlashcardResponse,
)

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


@router.post(
    "/generate",
    response_model=FlashcardDeckResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_document_flashcards(
    request: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Verify that the document belongs to the authenticated user.
    result = await db.execute(
        select(Document).where(
            Document.id == request.document_id,
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
            detail="Document processing is not complete.",
        )

    # 2. Retrieve relevant passages from the selected document.
    try:
        chunks = await retrieve_relevant_chunks(
            query=(
                "Identify the important concepts, definitions, "
                "facts, and topics covered in this document."
            ),
            user_id=current_user.id,
            db=db,
            document_ids=[request.document_id],
            top_k=20,
        )

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No usable document content was found.",
            )

        passages = "\n\n".join(
            chunk["content"] for chunk in chunks
        )

        # 3. Generate flashcards using the LLM.
        cards = await generate_flashcards(
            passages=passages,
            count=request.count,
        )

        # 4. Create the flashcard deck.
        deck = FlashcardDeck(
            document_id=document.id,
            title=f"Flashcards - {document.filename}"
        )
        
        db.add(deck)
        await db.flush()

        # 5. Save all generated flashcards.
        flashcard_records = [
            Flashcard(
                deck_id=deck.id,
                front=card["front"],
                back=card["back"],
                difficulty=card["difficulty"],
            )
            for card in cards
        ]

        db.add_all(flashcard_records)

        await db.commit()
        await db.refresh(deck)

        for card in flashcard_records:
            await db.refresh(card)

        return {
            "id": deck.id,
            "document_id": deck.document_id,
            "title": deck.title,
            "created_at": deck.created_at,
            "flashcards": flashcard_records,
        }
            
    except HTTPException:
        await db.rollback()
        raise

    except Exception as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Flashcard generation failed: {str(exc)[:300]}",
        ) from exc



@router.get(
    "/decks",
    response_model=list[FlashcardDeckResponse],
)
async def get_flashcard_decks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only return decks belonging to the current user's documents.
    result = await db.execute(
        select(FlashcardDeck)
        .join(
            Document,
            FlashcardDeck.document_id == Document.id,
        )
        .where(Document.user_id == current_user.id)
        .order_by(desc(FlashcardDeck.created_at))
    )

    decks = result.scalars().all()

    response = []

    for deck in decks:
        cards_result = await db.execute(
            select(Flashcard)
            .where(Flashcard.deck_id == deck.id)
            .order_by(Flashcard.id)
        )

        cards = cards_result.scalars().all()

        response.append(
            FlashcardDeckResponse(
                id=deck.id,
                document_id=deck.document_id,
                title=deck.title,
                created_at=deck.created_at,
                flashcards=[
                    FlashcardResponse.model_validate(card)
                    for card in cards
                ],
            )
        )

    return response
