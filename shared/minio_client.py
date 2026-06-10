"""
Shared MinIO (S3-compatible) client for all services.
Handles cover images (public bucket) and pipeline media files.
"""

import io
import logging
from uuid import uuid4

from miniopy_async import Minio
from miniopy_async.error import S3Error

from shared.config import settings

logger = logging.getLogger(__name__)

client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)


async def _ensure_bucket(bucket: str) -> None:
    found = await client.bucket_exists(bucket)
    if not found:
        await client.make_bucket(bucket)


async def upload_image_to_s3(file) -> str | None:
    """Upload a cover image (FastAPI UploadFile) and return its public URL."""
    try:
        bucket = settings.MINIO_BUCKET_IMAGES
        await _ensure_bucket(bucket)

        ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'jpg'
        file_name = f"{uuid4().hex}.{ext}"

        content = await file.read()
        await client.put_object(
            bucket_name=bucket,
            object_name=file_name,
            data=io.BytesIO(content),
            length=len(content),
            content_type=file.content_type or "image/jpeg",
        )

        url = f"{settings.minio_public_base_url}/{bucket}/{file_name}"
        logger.info("Successfully uploaded image: %s", url)
        return url
    except S3Error as err:
        logger.error("S3 Error uploading image: %s", err)
        return None
    except Exception as e:
        logger.error("Unexpected error uploading image: %s", e)
        return None


async def upload_media_bytes(
    content: bytes,
    filename: str | None,
    content_type: str | None = None,
) -> str:
    """Upload raw bytes to the pipeline media bucket; return the object key."""
    bucket = settings.MINIO_BUCKET_MEDIA
    await _ensure_bucket(bucket)

    ext = filename.rsplit('.', 1)[-1].lower() if filename and '.' in filename else 'bin'
    object_key = f"{uuid4().hex}.{ext}"

    await client.put_object(
        bucket_name=bucket,
        object_name=object_key,
        data=io.BytesIO(content),
        length=len(content),
        content_type=content_type or "application/octet-stream",
    )
    logger.info("Uploaded pipeline media %s (%d bytes) to bucket %s", object_key, len(content), bucket)
    return object_key


async def download_media_bytes(object_key: str) -> bytes:
    """Download an object from the pipeline media bucket."""
    bucket = settings.MINIO_BUCKET_MEDIA
    response = None
    try:
        try:
            response = await client.get_object(bucket, object_key)
        except TypeError:
            # Older miniopy-async versions require an explicit aiohttp session
            import aiohttp

            async with aiohttp.ClientSession() as session:
                response = await client.get_object(bucket, object_key, session)
                return await response.read()
        return await response.read()
    finally:
        if response is not None:
            for closer in ("close", "release"):
                method = getattr(response, closer, None)
                if callable(method):
                    try:
                        result = method()
                        if hasattr(result, "__await__"):
                            await result
                    except Exception:
                        pass
                    break


async def delete_media_object(object_key: str) -> None:
    """Remove an object from the pipeline media bucket (best effort)."""
    try:
        await client.remove_object(settings.MINIO_BUCKET_MEDIA, object_key)
    except Exception as e:
        logger.warning("Could not delete media object %s: %s", object_key, e)
