"""
RabbitMQ message broker client using aio-pika.
Provides pub/sub messaging between microservices.
"""

import json
import logging
from typing import Any, Callable, Awaitable

import aio_pika
from aio_pika import Message, DeliveryMode

from shared.config import settings

logger = logging.getLogger(__name__)


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

    async def publish(self, queue_name: str, message: dict[str, Any]) -> None:
        """Publish a message to a queue."""
        if not self.channel:
            raise RuntimeError("Broker not connected. Call connect() first.")

        queue = await self.channel.declare_queue(queue_name, durable=True)
        body = json.dumps(message, default=str).encode()

        await self.channel.default_exchange.publish(
            Message(
                body=body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
            ),
            routing_key=queue_name,
        )
        logger.debug("Published message to queue '%s'", queue_name)

    async def consume(
        self,
        queue_name: str,
        callback: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        """Consume messages from a queue."""
        if not self.channel:
            raise RuntimeError("Broker not connected. Call connect() first.")

        queue = await self.channel.declare_queue(queue_name, durable=True)

        async def on_message(message: aio_pika.IncomingMessage) -> None:
            async with message.process():
                try:
                    body = json.loads(message.body.decode())
                    await callback(body)
                except Exception as e:
                    logger.error(
                        "Error processing message from '%s': %s", queue_name, e
                    )

        await queue.consume(on_message)
        logger.info("Started consuming from queue '%s'", queue_name)


# Queue name constants
VALIDATION_QUEUE = "content.validation"
AI_ANALYSIS_QUEUE = "content.ai_analysis"
ANALYTICS_QUEUE = "analytics.events"


# Singleton
broker = MessageBroker()
