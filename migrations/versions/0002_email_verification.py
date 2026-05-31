"""Add email verification fields to users.

Revision ID: 0002_email_verification
Revises: 0001_initial
Create Date: 2026-05-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_email_verification"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("verification_token", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "verification_token_expires",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index("ix_users_verification_token", "users", ["verification_token"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_verification_token", table_name="users")
    op.drop_column("users", "verification_token_expires")
    op.drop_column("users", "verification_token")
    op.drop_column("users", "email_verified")
