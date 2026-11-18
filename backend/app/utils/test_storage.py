
from app.core.config import settings
from app.services.storage_service import get_supabase_client


def main():
    client = get_supabase_client()

    buckets = client.storage.list_buckets()

    bucket_names = [bucket.name for bucket in buckets]

    if settings.SUPABASE_STORAGE_BUCKET not in bucket_names:
        raise RuntimeError(
            f"Bucket '{settings.SUPABASE_STORAGE_BUCKET}' "
            "was not found. Check your Supabase Storage setup."
        )

    print("SUPABASE STORAGE CONNECTION SUCCESSFUL")
    print("PRIVATE DOCUMENT BUCKET FOUND")


if __name__ == "__main__":
    main()
