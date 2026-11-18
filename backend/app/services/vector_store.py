
import chromadb

from functools import lru_cache
from app.core.config import settings

COLLECTION_NAME = "academic_document_chunks"


@lru_cache(maxsize=1)
def get_chroma_client():
    """
    Create one persistent ChromaDB client.
    """
    return chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR
    )


@lru_cache(maxsize=1)
def get_collection():
    """
    Retrieve or create the persistent vector collection.
    Cosine distance is used for similarity retrieval.
    """
    client = get_chroma_client()

    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def store_chunks(
    chunk_ids: list[str],
    texts: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    """
    Store document chunks and their embeddings in ChromaDB.
    """
    if not chunk_ids:
        return

    if not (
        len(chunk_ids) == len(texts)
        == len(embeddings) == len(metadatas)
    ):
        raise ValueError("Chunk data lists must have equal lengths.")

    collection = get_collection()

    collection.upsert(
        ids=chunk_ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def delete_chunks(chunk_ids: list[str]) -> None:
    """
    Remove vector records from ChromaDB.
    """
    if not chunk_ids:
        return

    collection = get_collection()
    collection.delete(ids=chunk_ids)


def search_chunks(
    query_embedding: list[float],
    user_id: str,
    document_ids: list[str] | None = None,
    top_k: int = 5,
) -> dict:
    """
    Search only within the requesting user's documents.
    Optionally restrict retrieval to selected documents.
    """
    if not user_id:
        raise ValueError("User ID is required for vector search.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    collection = get_collection()

    filters = [{"user_id": user_id}]

    if document_ids:
        filters.append(
            {"document_id": {"$in": document_ids}}
        )

    where_filter = (
        filters[0]
        if len(filters) == 1
        else {"$and": filters}
    )

    return collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )
