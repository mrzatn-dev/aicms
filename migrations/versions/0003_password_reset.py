"""Add password reset token fields to users.

Revision ID: 0003_password_reset
Revises: 0002_email_verification
Create Date: 2026-05-31
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0003_password_reset"
down_revision: Union[str, None] = "0002_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _users_columns() -> set[str]:
    bind = op.get_bind()
    return {column["name"] for column in inspect(bind).get_columns("users")}


def upgrade() -> None:
    columns = _users_columns()

    if "password_reset_token" not in columns:
        op.add_column(
            "users",
            sa.Column("password_reset_token", sa.String(length=128), nullable=True),
        )

    if "password_reset_expires" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "password_reset_expires",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )

    bind = op.get_bind()
    indexes = {index["name"] for index in inspect(bind).get_indexes("users")}
    if "ix_users_password_reset_token" not in indexes:
        op.create_index(
            "ix_users_password_reset_token",
            "users",
            ["password_reset_token"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    indexes = {index["name"] for index in inspect(bind).get_indexes("users")}
    if "ix_users_password_reset_token" in indexes:
        op.drop_index("ix_users_password_reset_token", table_name="users")

    columns = _users_columns()
    if "password_reset_expires" in columns:
        op.drop_column("users", "password_reset_expires")
    if "password_reset_token" in columns:
        op.drop_column("users", "password_reset_token")
