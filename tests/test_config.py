"""Configuration helper tests."""

from shared.config import AppSettings


def test_redis_url_without_password() -> None:
    settings = AppSettings(REDIS_HOST="redis", REDIS_PORT=6379, REDIS_PASSWORD=None)
    assert settings.redis_url == "redis://redis:6379/0"


def test_redis_url_with_password() -> None:
    settings = AppSettings(
        REDIS_HOST="redis",
        REDIS_PORT=6379,
        REDIS_PASSWORD="s3cret!",
    )
    assert settings.redis_url == "redis://:s3cret%21@redis:6379/0"


def test_minio_public_base_url_from_setting() -> None:
    settings = AppSettings(MINIO_PUBLIC_URL="https://cdn.example.com/assets")
    assert settings.minio_public_base_url == "https://cdn.example.com/assets"


def test_minio_public_base_url_from_endpoint() -> None:
    settings = AppSettings(
        MINIO_ENDPOINT="minio:9000",
        MINIO_SECURE=False,
        MINIO_PUBLIC_URL=None,
    )
    assert settings.minio_public_base_url == "http://minio:9000"
