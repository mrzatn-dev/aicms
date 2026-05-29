"""
Base configuration for all microservices.
Uses pydantic-settings for env var support.
"""

from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field

ROOT_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def as_http_url(value: str) -> str:
    """Normalize Render host:port references and local URLs into HTTP URLs."""
    normalized = value.strip().rstrip("/")
    if normalized.startswith(("http://", "https://")):
        return normalized
    return f"http://{normalized}"


class DatabaseSettings(BaseSettings):
    """Database connection settings."""

    DATABASE_URL: str | None = Field(default=None, description="Full PostgreSQL connection string")
    DB_HOST: str = Field(default="localhost", description="PostgreSQL host")
    DB_PORT: int = Field(default=5432, description="PostgreSQL port")
    DB_USER: str = Field(default="postgres", description="PostgreSQL user")
    DB_PASSWORD: str = Field(default="postgres", description="PostgreSQL password")
    DB_NAME: str = Field(default="cms_db", description="PostgreSQL database name")

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
                return self.DATABASE_URL
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            if self.DATABASE_URL.startswith("postgres://"):
                return self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def database_url_sync(self) -> str:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
                return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
            if self.DATABASE_URL.startswith("postgres://"):
                return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class RedisSettings(BaseSettings):
    """Redis connection settings."""

    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    REDIS_DB: int = Field(default=0, description="Redis database number")

    @property
    def redis_url(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class RabbitMQSettings(BaseSettings):
    """RabbitMQ connection settings."""

    RABBITMQ_HOST: str = Field(default="localhost", description="RabbitMQ host")
    RABBITMQ_PORT: int = Field(default=5672, description="RabbitMQ port")
    RABBITMQ_MANAGEMENT_PORT: int = Field(
        default=15672, description="RabbitMQ management API port"
    )
    RABBITMQ_USER: str = Field(default="guest", description="RabbitMQ user")
    RABBITMQ_PASSWORD: str = Field(default="guest", description="RabbitMQ password")

    @property
    def rabbitmq_url(self) -> str:
        return (
            f"amqp://{self.RABBITMQ_USER}:{self.RABBITMQ_PASSWORD}"
            f"@{self.RABBITMQ_HOST}:{self.RABBITMQ_PORT}/"
        )

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class MinioSettings(BaseSettings):
    """Minio connection settings."""

    MINIO_ENDPOINT: str = Field(default="localhost:9000", description="Minio endpoint")
    MINIO_ACCESS_KEY: str = Field(default="minioadmin", description="Minio access key")
    MINIO_SECRET_KEY: str = Field(default="minioadmin", description="Minio secret key")
    MINIO_SECURE: bool = Field(default=False, description="Use HTTPS for Minio")
    MINIO_BUCKET_IMAGES: str = Field(default="cms-images", description="Bucket for images")

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class JWTSettings(BaseSettings):
    """JWT authentication settings."""

    JWT_SECRET_KEY: str = Field(
        default="super-secret-key-change-in-production",
        description="Secret key for JWT encoding",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="Access token expiration in minutes"
    )

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class CORSSettings(BaseSettings):
    """CORS configuration for production security."""

    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        description="Comma-separated list of allowed CORS origins",
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow credentials (cookies, headers) in CORS requests",
    )
    CORS_ALLOW_METHODS: list[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        description="Allowed HTTP methods",
    )
    CORS_ALLOW_HEADERS: list[str] = Field(
        default=[
            "Content-Type",
            "Authorization",
            "X-Interface-Language",
            "X-Requested-With",
        ],
        description="Allowed request headers",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into list."""
        origins = self.CORS_ORIGINS.split(",")
        return [origin.strip() for origin in origins if origin.strip()]

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class OAuthSettings(BaseSettings):
    """OAuth provider settings (Google)."""

    GOOGLE_CLIENT_ID: str | None = Field(default=None, description="Google OAuth client ID")
    GOOGLE_CLIENT_SECRET: str | None = Field(
        default=None, description="Google OAuth client secret"
    )
    OAUTH_REDIRECT_URI: str = Field(
        default="http://localhost:3000/oauth/callback",
        description="Frontend URL receiving JWT after OAuth",
    )
    OAUTH_API_BASE_URL: str = Field(
        default="http://localhost:8000",
        description="Public API Gateway URL for provider callbacks",
    )

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


class AppSettings(
    DatabaseSettings,
    RedisSettings,
    RabbitMQSettings,
    MinioSettings,
    JWTSettings,
    CORSSettings,
    OAuthSettings,
):
    """Combined application settings for all microservices."""

    APP_NAME: str = Field(default="CMS Microservice", description="Application name")
    APP_VERSION: str = Field(default="1.0.0", description="Application version")
    DEBUG: bool = Field(default=False, description="Debug mode")
    DEEPSEEK_API_KEY: str | None = Field(default=None, description="DeepSeek API Key")
    API_GATEWAY_URL: str = Field(default="http://api-gateway:8000", description="Internal API Gateway URL")
    AUTH_SERVICE_URL: str = Field(default="http://auth-service:8001", description="Internal auth service URL")
    CONTENT_SERVICE_URL: str = Field(default="http://content-service:8002", description="Internal content service URL")
    VALIDATION_SERVICE_URL: str = Field(default="http://validation-service:8003", description="Internal validation service URL")
    AI_SERVICE_URL: str = Field(default="http://ai-service:8004", description="Internal AI service URL")
    ANALYTICS_SERVICE_URL: str = Field(default="http://analytics-service:8005", description="Internal analytics service URL")
    USER_SERVICE_URL: str = Field(default="http://user-service:8006", description="Internal user service URL")
    TRANSCRIPTION_SERVICE_URL: str = Field(default="http://transcription-service:8007", description="Internal transcription service URL")

    model_config = {"env_file": str(ROOT_ENV_FILE), "extra": "ignore"}


# Singleton settings instance
settings = AppSettings()
