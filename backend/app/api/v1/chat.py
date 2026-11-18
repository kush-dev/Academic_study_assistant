
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import (
    ChatMessage,
    ChatSession,
    Document,
    ProcessingStatus,
    User,
)
from app.schemas.chat import (
    ChatAnswerResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
)
from app.services.rag_service import answer_question


router = APIRouter(prefix="/chat", tags=["Chat"])


async def validate_user_documents(
    document_ids: list[UUID],
    user_id: UUID,
    db: AsyncSession,
) -> list[str]:
    """Verify that selected documents belong to the user and are ready."""

    if not document_ids:
        return []

    result = await db.execute(
        select(Document.id).where(
            Document.id.in_(document_ids),
            Document.user_id == user_id,
            Document.processing_status == ProcessingStatus.COMPLETED,
        )
    )

    valid_ids = result.scalars().all()

    if len(set(valid_ids)) != len(set(document_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "One or more selected documents do not exist, "
                "do not belong to you, or have not completed processing."
            ),
        )

    return [str(document_id) for document_id in valid_ids]


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document_ids = await validate_user_documents(
        session_data.document_ids,
        current_user.id,
        db,
    )

    session = ChatSession(
        user_id=current_user.id,
        title=session_data.title.strip() or "New conversation",
        document_ids=document_ids,
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return session


@router.get(
    "/sessions",
    response_model=list[ChatSessionResponse],
)
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )

    return result.scalars().all()


@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[ChatMessageResponse],
)
async def get_chat_messages(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )

    session = session_result.scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )

    return result.scalars().all()


@router.post(
    "/message",
    response_model=ChatAnswerResponse,
)
async def send_chat_message(
    message_data: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Find the conversation and verify ownership.
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == message_data.session_id,
            ChatSession.user_id == current_user.id,
        )
    )

    session = session_result.scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )

    # 2. Determine which documents should be searched.
    if message_data.document_ids is not None:
        selected_document_ids = await validate_user_documents(
            message_data.document_ids,
            current_user.id,
            db,
        )

        session.document_ids = selected_document_ids
    else:
        selected_document_ids = session.document_ids or []

    # An empty selection means search all completed documents
    # belonging to this user.
    retrieval_document_ids = (
        [UUID(document_id) for document_id in selected_document_ids]
        if selected_document_ids
        else None
    )

    # 3. Load the most recent six messages as conversation context.
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
    )

    previous_messages = list(reversed(history_result.scalars().all()))

    chat_history = [
        {
            "role": previous_message.role,
            "content": previous_message.content,
        }
        for previous_message in previous_messages
        if previous_message.role in ("user", "assistant")
    ]

    # 4. Save the student's message.
    user_message = ChatMessage(
        session_id=session.id,
        role="user",
        content=message_data.message.strip(),
        citations=[],
    )

    db.add(user_message)

    # Use the first question as the conversation title.
    if not session.title or session.title == "New conversation":
        session.title = message_data.message.strip()[:80]

    await db.commit()
    await db.refresh(user_message)

    # 5. Generate the answer using the existing RAG pipeline.
    try:
        rag_result = await answer_question(
            query=message_data.message.strip(),
            user_id=current_user.id,
            db=db,
            document_ids=retrieval_document_ids,
            chat_history=chat_history,
            top_k=5,
        )

    except Exception as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not generate an AI response: {str(exc)[:300]}",
        ) from exc

    # 6. Save the assistant response and its citations.
    assistant_message = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=rag_result["answer"],
        citations=rag_result["citations"],
    )

    db.add(assistant_message)

    await db.commit()
    await db.refresh(assistant_message)

    # 7. Return the complete response to the frontend.
    return {
        "session_id": session.id,
        "user_message_id": user_message.id,
        "assistant_message_id": assistant_message.id,
        "answer": rag_result["answer"],
        "citations": rag_result["citations"],
        "sources": rag_result["sources"],
        "insufficient_evidence": rag_result["insufficient_evidence"],
        "retrieved_count": rag_result["retrieved_count"],
    }
