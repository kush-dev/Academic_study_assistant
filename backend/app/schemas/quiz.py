
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuizGenerateRequest(BaseModel):
    document_id: UUID
    count: int = Field(default=10, ge=1, le=30)


class QuizQuestionResponse(BaseModel):
    id: UUID
    quiz_id: UUID
    question_text: str
    options: list[str]
    question_order: int
    topic: str = "General"

    model_config = ConfigDict(from_attributes=True)


class QuizResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str
    created_at: datetime
    questions: list[QuizQuestionResponse] = Field(default_factory=list)

    attempt_count: int = 0
    latest_score: float | None = None
    best_score: float | None = None
    last_attempt_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class QuizSubmitRequest(BaseModel):
    answers: dict[str, int]


class QuizResultResponse(BaseModel):
    quiz_id: UUID
    score: float
    total_questions: int
    correct_answers: int
    submitted_at: datetime
    results: list[dict]


class QuizScoreHistoryItem(BaseModel):
    quiz_id: UUID
    quiz_title: str
    score: float
    submitted_at: datetime


class TopicPerformanceItem(BaseModel):
    topic: str
    accuracy: float
    correct_answers: int
    total_questions: int
    document_names: list[str] = Field(default_factory=list)


class QuizHistoryItem(BaseModel):
    quiz_id: UUID
    document_id: UUID
    document_name: str
    title: str
    attempt_count: int
    latest_score: float | None = None
    best_score: float | None = None
    last_attempt_at: datetime | None = None


class StudyRecommendation(BaseModel):
    topic: str
    accuracy: float
    message: str
    document_id: UUID
    document_name: str
    quiz_id: UUID
    quiz_title: str


class QuizAnalyticsResponse(BaseModel):
    total_quizzes: int
    completed_quizzes: int
    total_attempts: int
    average_score: float
    best_score: float
    latest_score: float | None = None

    score_history: list[QuizScoreHistoryItem] = Field(default_factory=list)
    topic_performance: list[TopicPerformanceItem] = Field(default_factory=list)
    strengths: list[TopicPerformanceItem] = Field(default_factory=list)
    weaknesses: list[TopicPerformanceItem] = Field(default_factory=list)
    recommendations: list[StudyRecommendation] = Field(default_factory=list)
    quiz_history: list[QuizHistoryItem] = Field(default_factory=list)
