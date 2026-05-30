import io
import logging
from uuid import uuid4
from fastapi import UploadFile
from miniopy_async import Minio
from miniopy_async.error import S3Error

from shared.config import settings

logger = logging.getLogger(__name__)

# Initialize minio client
client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)

async def upload_image_to_s3(file: UploadFile) -> str | None:
    """
    Uploads an image to MinIO and returns public URL
    """
    try:
        # Check if bucket exists, create if not
        bucket = settings.MINIO_BUCKET_IMAGES
        found = await client.bucket_exists(bucket)
        if not found:
            await client.make_bucket(bucket)

        # Generate unique filename
        ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'jpg'
        file_name = f"{uuid4().hex}.{ext}"

        # Read file into memory
        content = await file.read()
        file_size = len(content)
        data = io.BytesIO(content)

        # Upload
        await client.put_object(
            bucket_name=bucket,
            object_name=file_name,
            data=data,
            length=file_size,
            content_type=file.content_type or "image/jpeg"
        )
        
        url = f"{settings.minio_public_base_url}/{bucket}/{file_name}"
        logger.info(f"Successfully uploaded image: {url}")
        return url
        
    except S3Error as err:
        logger.error(f"S3 Error uploading image: {err}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error uploading image: {e}")
        return None
