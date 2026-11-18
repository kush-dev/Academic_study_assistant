from app.api.v1.documents import router as documents_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.core.config import settings
from app.api.v1.folders import router as folders_router
from app.api.v1.chat import router as chat_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.summaries import router as summaries_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "A document-grounded academic study assistant "
        "using Retrieval-Augmented Generation."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.API_V1_PREFIX)

app.include_router(
    documents_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(
    folders_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(chat_router, prefix=settings.API_V1_PREFIX)

app.include_router(
    flashcards_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(
    quizzes_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(
    summaries_router,
    prefix=settings.API_V1_PREFIX,
)

@app.get("/", tags=["General"])
async def root():
    return {
        "message": "Academic Study Assistant API is running",
        "version": settings.APP_VERSION,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "application": settings.APP_NAME,
    }
