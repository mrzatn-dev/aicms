"""Initial database schema from SQLAlchemy models.

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-30
"""

from typing import Sequence, Union

from alembic import op

from shared.database import Base
import shared.models  # noqa: F401

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
