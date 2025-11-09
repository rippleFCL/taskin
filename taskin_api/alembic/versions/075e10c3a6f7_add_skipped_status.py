"""add_skipped_status

Revision ID: 075e10c3a6f7
Revises: 2a2c3fcdf25e
Create Date: 2025-11-05 20:43:05.965812

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "075e10c3a6f7"
down_revision = "2a2c3fcdf25e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite stores enums as VARCHAR, so we don't need to modify the column type
    # The new 'skipped' value will be automatically supported
    # This is a no-op migration for documentation purposes
    pass


def downgrade() -> None:
    # Convert any 'skipped' status back to 'incomplete'
    op.execute("UPDATE todos SET status = 'incomplete' WHERE status = 'skipped'")
    op.execute("UPDATE oneoff_todos SET status = 'incomplete' WHERE status = 'skipped'")
