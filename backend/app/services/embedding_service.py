
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIMENSION = 384


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Load the embedding model once and reuse it.
    CPU is used by default for compatibility.
    """
    return SentenceTransformer(
        EMBEDDING_MODEL,
        device="cpu",
    )


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate normalized 384-dimensional embeddings.
    """
    if not texts:
        return []

    cleaned_texts = [text.strip() for text in texts]

    if any(not text for text in cleaned_texts):
        raise ValueError("Embedding input cannot contain empty text.")

    model = get_embedding_model()

    embeddings = model.encode(
        cleaned_texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    embeddings = np.asarray(embeddings, dtype=np.float32)

    if embeddings.ndim != 2:
        raise ValueError("Unexpected embedding output dimensions.")

    if embeddings.shape[1] != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION} dimensions, "
            f"received {embeddings.shape[1]}."
        )

    return embeddings.tolist()


def generate_query_embedding(query: str) -> list[float]:
    """
    Generate an embedding for a student's search question.
    Uses the same model and normalization as document embeddings.
    """
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty.")

    return generate_embeddings([query])[0]
