"""Add email verification fields to users.

Revision ID: 0002_email_verification
Revises: 0001_initial
Create Date: 2026-05-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0002_email_verification"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _users_columns() -> set[str]:
    bind = op.get_bind()
    return {column["name"] for column in inspect(bind).get_columns("users")}


def upgrade() -> None:
    columns = _users_columns()

    if "email_verified" not in columns:
        op.add_column(
            "users",
            sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
        )

    if "verification_token" not in columns:
        op.add_column(
            "users",
            sa.Column("verification_token", sa.String(length=128), nullable=True),
        )

    if "verification_token_expires" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "verification_token_expires",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )

    bind = op.get_bind()
    indexes = {index["name"] for index in inspect(bind).get_indexes("users")}
    if "ix_users_verification_token" not in indexes:
        op.create_index(
            "ix_users_verification_token",
            "users",
            ["verification_token"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    indexes = {index["name"] for index in inspect(bind).get_indexes("users")}
    if "ix_users_verification_token" in indexes:
        op.drop_index("ix_users_verification_token", table_name="users")

    columns = _users_columns()
    if "verification_token_expires" in columns:
        op.drop_column("users", "verification_token_expires")
    if "verification_token" in columns:
        op.drop_column("users", "verification_token")
    if "email_verified" in columns:
        op.drop_column("users", "email_verified")
