
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import (
    Document,
    ProcessingStatus,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
)
from app.schemas.quiz import (
    QuizAnalyticsResponse,
    QuizGenerateRequest,
    QuizHistoryItem,
    QuizQuestionResponse,
    QuizResponse,
    QuizResultResponse,
    QuizScoreHistoryItem,
    QuizSubmitRequest,
    StudyRecommendation,
    TopicPerformanceItem,
)
from app.services.quiz_service import generate_quiz_questions
from app.services.retrieval_service import retrieve_relevant_chunks


router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


def determine_adaptive_difficulty(scores: list[float]) -> str:
    """
    Determine difficulty from the average of recent quiz attempts.
    """

    if not scores:
        return "Medium"

    recent_scores = scores[:3]
    average = sum(recent_scores) / len(recent_scores)

    if average < 50:
        return "Easy"
    if average < 70:
        return "Medium"
    if average < 85:
        return "Hard"

    return "Advanced"


async def get_adaptive_settings(
    document_id: UUID,
    user_id: UUID,
    db: AsyncSession,
):
    """
    Analyse previous attempts for one document and return
    personalized difficulty and topic priorities.
    """

    attempt_result = await db.execute(
        select(QuizAttempt)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .where(
            Quiz.user_id == user_id,
            Quiz.document_id == document_id,
        )
        .order_by(desc(QuizAttempt.submitted_at))
        .limit(5)
    )

    attempts = attempt_result.scalars().all()

    if not attempts:
        return {
            "difficulty": "Medium",
            "recent_average_score": None,
            "attempts_considered": 0,
            "topic_focus": [],
            "reason": (
                "No previous quiz attempts were found for this document. "
                "A medium-difficulty baseline quiz has been selected."
            ),
        }

    recent_scores = [
        float(attempt.score)
        for attempt in attempts
    ]

    recent_average = round(
        sum(recent_scores[:3]) / len(recent_scores[:3]),
        2,
    )

    difficulty = determine_adaptive_difficulty(recent_scores)

    question_result = await db.execute(
        select(QuizQuestion)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .where(
            Quiz.user_id == user_id,
            Quiz.document_id == document_id,
        )
    )

    questions = question_result.scalars().all()

    question_lookup = {
        str(question.id): question
        for question in questions
    }

    topic_totals = defaultdict(
        lambda: {
            "correct": 0,
            "total": 0,
        }
    )

    for attempt in attempts:
        for question_id, selected_option in attempt.answers.items():
            question = question_lookup.get(str(question_id))

            if question is None:
                continue

            try:
                selected = int(selected_option)
                correct = int(question.correct_option)
            except (TypeError, ValueError):
                continue

            topic = (
                (question.topic or "General").strip()
                or "General"
            )

            topic_totals[topic]["total"] += 1

            if selected == correct:
                topic_totals[topic]["correct"] += 1

    topic_results = []

    for topic, values in topic_totals.items():
        total = values["total"]
        correct = values["correct"]

        if total == 0:
            continue

        accuracy = round((correct / total) * 100, 2)

        if accuracy < 60:
            priority = "High"
        elif accuracy < 80:
            priority = "Medium"
        else:
            priority = "Low"

        topic_results.append(
            {
                "topic": topic,
                "accuracy": accuracy,
                "priority": priority,
                "total_questions": total,
            }
        )

    # Weakest topics are selected first.
    topic_results.sort(
        key=lambda item: (
            item["accuracy"],
            -item["total_questions"],
        )
    )

    # Prioritize topics below 80% accuracy.
    weak_topics = [
        item
        for item in topic_results
        if item["accuracy"] < 80
    ]

    if weak_topics:
        selected_topics = weak_topics[:3]
        reason = (
            "Difficulty and topic selection were adjusted using "
            "your previous quiz performance."
        )
    else:
        # If all topics are strong, reinforce the topics with
        # the lowest accuracy rather than repeating only easy content.
        selected_topics = topic_results[:3]
        reason = (
            "Your previous performance is strong. The next quiz "
            "will reinforce your least-practised topics."
        )

    return {
        "difficulty": difficulty,
        "recent_average_score": recent_average,
        "attempts_considered": len(attempts),
        "topic_focus": selected_topics,
        "reason": reason,
    }


@router.post(
    "/generate",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_document_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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

    try:
        chunks = await retrieve_relevant_chunks(
            query=(
                "Identify the important concepts, facts, definitions, "
                "and topics that could be assessed in a quiz."
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

        if len(passages.split()) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "The document does not contain enough meaningful text "
                    "to generate a reliable quiz. Please upload a document "
                    "with more detailed academic content."
                ),
            )

        questions = await generate_quiz_questions(
            passages=passages,
            count=request.count,
        )

        quiz = Quiz(
            user_id=current_user.id,
            document_id=document.id,
            title=f"Quiz - {document.filename}",
        )

        db.add(quiz)
        await db.flush()

        question_records = [
            QuizQuestion(
                quiz_id=quiz.id,
                question_text=item["question_text"],
                options=item["options"],
                correct_option=str(item["correct_option"]),
                explanation=item["explanation"],
                question_order=index,
                topic=item.get("topic", "General"),
            )
            for index, item in enumerate(questions, start=1)
        ]

        db.add_all(question_records)

        await db.commit()
        await db.refresh(quiz)

        for question in question_records:
            await db.refresh(question)

        return QuizResponse(
            id=quiz.id,
            document_id=quiz.document_id,
            title=quiz.title,
            created_at=quiz.created_at,
            questions=[
                QuizQuestionResponse.model_validate(question)
                for question in question_records
            ],
        )

    except HTTPException:
        await db.rollback()
        raise

    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Quiz generation failed: {str(exc)[:300]}",
        ) from exc


@router.post(
    "/adaptive-generate",
    status_code=status.HTTP_201_CREATED,
)
async def generate_adaptive_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a quiz personalized using the student's previous
    performance on the selected document.
    """

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

    try:
        adaptation = await get_adaptive_settings(
            document_id=document.id,
            user_id=current_user.id,
            db=db,
        )

        topic_focus = adaptation["topic_focus"]

        if topic_focus:
            topic_query = ", ".join(
                item["topic"] for item in topic_focus
            )

            retrieval_query = (
                "Generate academic quiz questions focusing especially on "
                f"these topics: {topic_query}. "
                "Retrieve explanations, definitions, facts, and examples "
                "related to these topics."
            )
        else:
            retrieval_query = (
                "Identify important concepts, facts, definitions, "
                "and topics suitable for an introductory academic quiz."
            )

        chunks = await retrieve_relevant_chunks(
            query=retrieval_query,
            user_id=current_user.id,
            db=db,
            document_ids=[document.id],
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

        if len(passages.split()) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "The document does not contain enough meaningful "
                    "content to generate a reliable adaptive quiz."
                ),
            )

        prioritized_topic_names = [
            item["topic"] for item in topic_focus
        ]

        questions = await generate_quiz_questions(
            passages=passages,
            count=request.count,
            difficulty=adaptation["difficulty"],
            prioritized_topics=prioritized_topic_names,
        )

        quiz = Quiz(
            user_id=current_user.id,
            document_id=document.id,
            title=f"Adaptive Quiz - {document.filename}",
        )

        db.add(quiz)
        await db.flush()

        question_records = [
            QuizQuestion(
                quiz_id=quiz.id,
                question_text=item["question_text"],
                options=item["options"],
                correct_option=str(item["correct_option"]),
                explanation=item["explanation"],
                question_order=index,
                topic=item.get("topic", "General"),
            )
            for index, item in enumerate(questions, start=1)
        ]

        db.add_all(question_records)

        await db.commit()
        await db.refresh(quiz)

        for question in question_records:
            await db.refresh(question)

        quiz_response = QuizResponse(
            id=quiz.id,
            document_id=quiz.document_id,
            title=quiz.title,
            created_at=quiz.created_at,
            questions=[
                QuizQuestionResponse.model_validate(question)
                for question in question_records
            ],
        )

        return {
            **quiz_response.model_dump(mode="json"),
            "adaptive": True,
            "adaptation": adaptation,
        }

    except HTTPException:
        await db.rollback()
        raise

    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"Adaptive quiz generation failed: {str(exc)[:300]}"
            ),
        ) from exc


@router.post(
    "/{quiz_id}/submit",
    response_model=QuizResultResponse,
)
async def submit_quiz(
    quiz_id: UUID,
    submission: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz_result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id,
        )
    )

    quiz = quiz_result.scalar_one_or_none()

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found.",
        )

    question_result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.question_order.asc())
    )

    questions = question_result.scalars().all()

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has no questions.",
        )

    question_lookup = {
        str(question.id): question
        for question in questions
    }

    submitted_ids = set(submission.answers.keys())
    expected_ids = set(question_lookup.keys())

    if submitted_ids != expected_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": (
                    "Submit exactly one answer for every quiz question."
                ),
                "expected_question_ids": sorted(expected_ids),
                "submitted_question_ids": sorted(submitted_ids),
                "missing_question_ids": sorted(
                    expected_ids - submitted_ids
                ),
                "extra_question_ids": sorted(
                    submitted_ids - expected_ids
                ),
            },
        )

    correct_answers = 0
    results = []

    for question in questions:
        question_id = str(question.id)
        selected_option = submission.answers[question_id]

        if (
            isinstance(selected_option, bool)
            or not isinstance(selected_option, int)
            or selected_option < 0
            or selected_option >= len(question.options)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid answer option for question {question_id}.",
            )

        is_correct = selected_option == int(question.correct_option)

        if is_correct:
            correct_answers += 1

        results.append(
            {
                "question_id": question_id,
                "question_text": question.question_text,
                "selected_option": selected_option,
                "correct_option": int(question.correct_option),
                "is_correct": is_correct,
                "explanation": question.explanation,
            }
        )

    total_questions = len(questions)

    score = round(
        (correct_answers / total_questions) * 100,
        2,
    )

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        answers=submission.answers,
        score=score,
    )

    db.add(attempt)

    await db.commit()
    await db.refresh(attempt)

    return {
        "quiz_id": quiz.id,
        "score": score,
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "submitted_at": attempt.submitted_at,
        "results": results,
    }


@router.get(
    "",
    response_model=list[QuizResponse],
)
async def get_saved_quizzes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz_result = await db.execute(
        select(Quiz)
        .where(Quiz.user_id == current_user.id)
        .order_by(desc(Quiz.created_at))
    )

    quizzes = quiz_result.scalars().all()

    attempt_result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.submitted_at.asc())
    )

    attempts = attempt_result.scalars().all()

    attempts_by_quiz = defaultdict(list)

    for attempt in attempts:
        attempts_by_quiz[attempt.quiz_id].append(attempt)

    response = []

    for quiz in quizzes:
        questions_result = await db.execute(
            select(QuizQuestion)
            .where(QuizQuestion.quiz_id == quiz.id)
            .order_by(QuizQuestion.question_order)
        )

        questions = questions_result.scalars().all()

        quiz_attempts = attempts_by_quiz[quiz.id]

        latest_attempt = (
            quiz_attempts[-1] if quiz_attempts else None
        )

        best_score = (
            max(attempt.score for attempt in quiz_attempts)
            if quiz_attempts
            else None
        )

        response.append(
            QuizResponse(
                id=quiz.id,
                document_id=quiz.document_id,
                title=quiz.title,
                created_at=quiz.created_at,
                questions=[
                    QuizQuestionResponse.model_validate(question)
                    for question in questions
                ],
                attempt_count=len(quiz_attempts),
                latest_score=(
                    latest_attempt.score if latest_attempt else None
                ),
                best_score=best_score,
                last_attempt_at=(
                    latest_attempt.submitted_at
                    if latest_attempt
                    else None
                ),
            )
        )

    return response


@router.get(
    "/analytics",
    response_model=QuizAnalyticsResponse,
)
async def get_quiz_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz_result = await db.execute(
        select(Quiz, Document)
        .join(Document, Quiz.document_id == Document.id)
        .where(Quiz.user_id == current_user.id)
        .order_by(desc(Quiz.created_at))
    )

    quiz_rows = quiz_result.all()

    quiz_lookup = {
        quiz.id: {
            "quiz": quiz,
            "document": document,
        }
        for quiz, document in quiz_rows
    }

    attempt_result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.submitted_at.asc())
    )

    attempts = attempt_result.scalars().all()

    question_result = await db.execute(
        select(QuizQuestion)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .where(Quiz.user_id == current_user.id)
    )

    questions = question_result.scalars().all()

    questions_by_quiz = defaultdict(list)

    for question in questions:
        questions_by_quiz[question.quiz_id].append(question)

    attempts_by_quiz = defaultdict(list)

    for attempt in attempts:
        attempts_by_quiz[attempt.quiz_id].append(attempt)

    scores = [
        float(attempt.score)
        for attempt in attempts
    ]

    average_score = (
        round(sum(scores) / len(scores), 2)
        if scores
        else 0.0
    )

    best_score = max(scores) if scores else 0.0
    latest_score = scores[-1] if scores else None

    completed_quiz_ids = {
        attempt.quiz_id for attempt in attempts
    }

    score_history = []

    for attempt in attempts:
        quiz_data = quiz_lookup.get(attempt.quiz_id)

        if quiz_data is None:
            continue

        score_history.append(
            QuizScoreHistoryItem(
                quiz_id=attempt.quiz_id,
                quiz_title=quiz_data["quiz"].title,
                score=float(attempt.score),
                submitted_at=attempt.submitted_at,
            )
        )

    topic_totals = defaultdict(
        lambda: {
            "correct": 0,
            "total": 0,
            "document_names": set(),
            "quiz_ids": set(),
        }
    )

    for attempt in attempts:
        quiz_data = quiz_lookup.get(attempt.quiz_id)

        if quiz_data is None:
            continue

        document_name = quiz_data["document"].filename

        for question in questions_by_quiz.get(attempt.quiz_id, []):
            question_id = str(question.id)
            selected_option = attempt.answers.get(question_id)

            if selected_option is None:
                continue

            topic = (
                (question.topic or "General").strip()
                or "General"
            )

            topic_totals[topic]["total"] += 1
            topic_totals[topic]["document_names"].add(document_name)
            topic_totals[topic]["quiz_ids"].add(attempt.quiz_id)

            if int(selected_option) == int(question.correct_option):
                topic_totals[topic]["correct"] += 1

    topic_performance = []

    for topic, values in topic_totals.items():
        total = values["total"]
        correct = values["correct"]

        accuracy = (
            round((correct / total) * 100, 2)
            if total
            else 0.0
        )

        topic_performance.append(
            TopicPerformanceItem(
                topic=topic,
                accuracy=accuracy,
                correct_answers=correct,
                total_questions=total,
                document_names=sorted(values["document_names"]),
            )
        )

    topic_performance.sort(
        key=lambda item: item.total_questions,
        reverse=True,
    )

    strengths = sorted(
        [
            item for item in topic_performance
            if item.accuracy >= 80
        ],
        key=lambda item: item.accuracy,
        reverse=True,
    )

    weaknesses = sorted(
        [
            item for item in topic_performance
            if item.accuracy < 70
        ],
        key=lambda item: item.accuracy,
    )

    recommendations = []

    for topic in weaknesses:
        topic_quiz_ids = topic_totals[topic.topic]["quiz_ids"]

        for quiz_id in sorted(
            topic_quiz_ids,
            key=lambda item: str(item),
        ):
            quiz_data = quiz_lookup.get(quiz_id)

            if quiz_data is None:
                continue

            quiz = quiz_data["quiz"]
            document = quiz_data["document"]

            recommendations.append(
                StudyRecommendation(
                    topic=topic.topic,
                    accuracy=topic.accuracy,
                    message=(
                        f"Review {topic.topic} in {document.filename}, "
                        "then retake this quiz to improve your score."
                    ),
                    document_id=document.id,
                    document_name=document.filename,
                    quiz_id=quiz.id,
                    quiz_title=quiz.title,
                )
            )

            if len(recommendations) >= 10:
                break

        if len(recommendations) >= 10:
            break

    quiz_history = []

    for quiz, document in quiz_rows:
        quiz_attempts = attempts_by_quiz[quiz.id]

        latest_attempt = (
            quiz_attempts[-1] if quiz_attempts else None
        )

        quiz_history.append(
            QuizHistoryItem(
                quiz_id=quiz.id,
                document_id=document.id,
                document_name=document.filename,
                title=quiz.title,
                attempt_count=len(quiz_attempts),
                latest_score=(
                    float(latest_attempt.score)
                    if latest_attempt
                    else None
                ),
                best_score=(
                    max(float(item.score) for item in quiz_attempts)
                    if quiz_attempts
                    else None
                ),
                last_attempt_at=(
                    latest_attempt.submitted_at
                    if latest_attempt
                    else None
                ),
            )
        )

    return QuizAnalyticsResponse(
        total_quizzes=len(quiz_rows),
        completed_quizzes=len(completed_quiz_ids),
        total_attempts=len(attempts),
        average_score=average_score,
        best_score=best_score,
        latest_score=latest_score,
        score_history=score_history,
        topic_performance=topic_performance,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations,
        quiz_history=quiz_history,
    )
