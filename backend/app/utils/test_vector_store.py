
import uuid

from app.services.embedding_service import (
    generate_embeddings,
    generate_query_embedding,
    EMBEDDING_DIMENSION,
)
from app.services.vector_store import (
    store_chunks,
    search_chunks,
    delete_chunks,
)


def main():
    print("\nTesting embedding generation...")

    sample_texts = [
        "Photosynthesis is the process by which plants produce food.",
        "The human heart pumps blood throughout the body.",
        "Python is a programming language used in software development.",
    ]

    embeddings = generate_embeddings(sample_texts)

    assert len(embeddings) == 3
    assert all(
        len(embedding) == EMBEDDING_DIMENSION
        for embedding in embeddings
    )

    print("Embedding dimensions:", len(embeddings[0]))
    print("EMBEDDING GENERATION SUCCESSFUL")

    print("\nTesting query embedding...")

    query_embedding = generate_query_embedding(
        "How do plants produce their food?"
    )

    assert len(query_embedding) == EMBEDDING_DIMENSION

    print("QUERY EMBEDDING SUCCESSFUL")

    print("\nTesting ChromaDB storage...")

    user_id = str(uuid.uuid4())
    document_id = str(uuid.uuid4())

    chunk_ids = [
        str(uuid.uuid4())
        for _ in sample_texts
    ]

    metadata = [
        {
            "user_id": user_id,
            "document_id": document_id,
            "chunk_index": index,
        }
        for index in range(len(sample_texts))
    ]

    store_chunks(
        chunk_ids=chunk_ids,
        texts=sample_texts,
        embeddings=embeddings,
        metadatas=metadata,
    )

    print("CHROMADB STORAGE SUCCESSFUL")

    print("\nTesting similarity search...")

    results = search_chunks(
        query_embedding=query_embedding,
        user_id=user_id,
        document_ids=[document_id],
        top_k=2,
    )

    assert results["ids"]
    assert len(results["ids"][0]) > 0

    print("Retrieved chunks:", len(results["ids"][0]))

    for text in results["documents"][0]:
        print("Retrieved:", text[:100])

    print("SIMILARITY SEARCH SUCCESSFUL")

    print("\nTesting vector deletion...")

    delete_chunks(chunk_ids)

    deleted_results = search_chunks(
        query_embedding=query_embedding,
        user_id=user_id,
        document_ids=[document_id],
        top_k=2,
    )

    assert len(deleted_results["ids"][0]) == 0

    print("VECTOR DELETION SUCCESSFUL")

    print("\nALL VECTOR STORE TESTS PASSED")


if __name__ == "__main__":
    main()
