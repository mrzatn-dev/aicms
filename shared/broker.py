"""
RabbitMQ message broker client using aio-pika.
Provides pub/sub messaging between microservices with retry + DLQ.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Awaitable

import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType

from shared.config import settings

logger = logging.getLogger(__name__)

MAX_MESSAGE_RETRIES = 3
RETRY_HEADER = "x-retry-count"


class MessageBroker:
    """Async RabbitMQ message broker."""

    def __init__(self):
        self.connection: aio_pika.RobustConnection | None = None
        self.channel: aio_pika.Channel | None = None

    async def connect(self) -> None:
        """Establish connection to RabbitMQ."""
        try:
            self.connection = await aio_pika.connect_robust(
                settings.rabbitmq_url,
                timeout=30,
            )
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=10)
            logger.info("Connected to RabbitMQ at %s", settings.RABBITMQ_HOST)
        except Exception as e:
            logger.error("Failed to connect to RabbitMQ: %s", e)
            raise

    async def disconnect(self) -> None:
        """Close RabbitMQ connection."""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("Disconnected from RabbitMQ")

    async def _declare_queue_with_dlx(self, queue_name: str) -> aio_pika.Queue:
        """Declare a durable queue with a dead-letter queue."""
        if not self.channel:
            raise RuntimeError("Broker not connected. Call connect() first.")

        dlx_name = f"{queue_name}.dlx"
        dlq_name = f"{queue_name}.dlq"

        dlx = await self.channel.declare_exchange(dlx_name, ExchangeType.DIRECT, durable=True)
        dlq = await self.channel.declare_queue(dlq_name, durable=True)
        await dlq.bind(dlx, routing_key=dlq_name)

        queue = await self.channel.declare_queue(
            queue_name,
            durable=True,
            arguments={
                "x-dead-letter-exchange": dlx_name,
                "x-dead-letter-routing-key": dlq_name,
            },
        )
        return queue

    async def publish(
        self,
        queue_name: str,
        message: dict[str, Any],
        *,
        retry_count: int = 0,
    ) -> None:
        """Publish a message to a queue."""
        if not self.channel:
            raise RuntimeError("Broker not connected. Call connect() first.")

        await self._declare_queue_with_dlx(queue_name)
        body = json.dumps(message, default=str).encode()
        headers = {RETRY_HEADER: retry_count} if retry_count else None

        await self.channel.default_exchange.publish(
            Message(
                body=body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
                headers=headers,
            ),
            routing_key=queue_name,
        )
        logger.debug("Published message to queue '%s' (retry=%s)", queue_name, retry_count)

    async def consume(
        self,
        queue_name: str,
        callback: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        """Consume messages from a queue with retry and dead-letter handling."""
        if not self.channel:
            raise RuntimeError("Broker not connected. Call connect() first.")

        queue = await self._declare_queue_with_dlx(queue_name)

        async def on_message(message: aio_pika.IncomingMessage) -> None:
            retry_count = 0
            if message.headers and RETRY_HEADER in message.headers:
                retry_count = int(message.headers[RETRY_HEADER])

            body: dict[str, Any] | None = None
            try:
                body = json.loads(message.body.decode())
            except json.JSONDecodeError as exc:
                logger.error("Invalid JSON on '%s': %s", queue_name, exc)
                await message.reject(requeue=False)
                return

            try:
                await callback(body)
                await message.ack()
            except Exception as exc:
                logger.error(
                    "Error processing message from '%s' (retry %s/%s): %s",
                    queue_name,
                    retry_count,
                    MAX_MESSAGE_RETRIES,
                    exc,
                )

                if retry_count < MAX_MESSAGE_RETRIES:
                    await message.ack()
                    await self.publish(queue_name, body, retry_count=retry_count + 1)
                    logger.info(
                        "Requeued message on '%s' (attempt %s)",
                        queue_name,
                        retry_count + 1,
                    )
                else:
                    await message.reject(requeue=False)
                    logger.error(
                        "Message sent to DLQ '%s.dlq' after %s failures",
                        queue_name,
                        MAX_MESSAGE_RETRIES,
                    )

        await queue.consume(on_message)
        logger.info("Started consuming from queue '%s' (DLQ enabled)", queue_name)


# Queue name constants
VALIDATION_QUEUE = "content.validation"
AI_ANALYSIS_QUEUE = "content.ai_analysis"
ANALYTICS_QUEUE = "analytics.events"

# Unified AI pipeline queues
PIPELINE_TRANSCRIBE_QUEUE = "pipeline.transcribe"
PIPELINE_MEDIA_QUEUE = "pipeline.analyze_media"
PIPELINE_COMPOSE_QUEUE = "pipeline.compose"


# Singleton
broker = MessageBroker()
