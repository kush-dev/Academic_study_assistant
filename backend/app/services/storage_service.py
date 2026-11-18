
import asyncio

from supabase import Client, create_client

from app.core.config import settings


def get_supabase_client() -> Client:
    if not settings.SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is missing.")

    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase service-role key is missing.")

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


def _upload_file(
    storage_path: str,
    file_content: bytes,
    content_type: str,
) -> None:
    client = get_supabase_client()

    client.storage.from_(
        settings.SUPABASE_STORAGE_BUCKET
    ).upload(
        path=storage_path,
        file=file_content,
        file_options={
            "content-type": content_type,
            "upsert": "false",
        },
    )


async def upload_file(
    storage_path: str,
    file_content: bytes,
    content_type: str,
) -> None:
    await asyncio.to_thread(
        _upload_file,
        storage_path,
        file_content,
        content_type,
    )


def _download_file(storage_path: str) -> bytes:
    client = get_supabase_client()

    return client.storage.from_(
        settings.SUPABASE_STORAGE_BUCKET
    ).download(storage_path)


async def download_file(storage_path: str) -> bytes:
    return await asyncio.to_thread(
        _download_file,
        storage_path,
    )


def _delete_file(storage_path: str) -> None:
    client = get_supabase_client()

    client.storage.from_(
        settings.SUPABASE_STORAGE_BUCKET
    ).remove([storage_path])


async def delete_file(storage_path: str) -> None:
    await asyncio.to_thread(
        _delete_file,
        storage_path,
    )
