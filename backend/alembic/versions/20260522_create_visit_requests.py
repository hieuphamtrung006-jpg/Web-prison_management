from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table(
        "VisitRequests",
        sa.Column("RequestID", sa.Integer, primary_key=True, nullable=False),
        sa.Column("PrisonerID", sa.Integer, sa.ForeignKey("Prisoners.PrisonerID"), nullable=False),
        sa.Column("ViewerID", sa.Integer, sa.ForeignKey("Users.UserID"), nullable=False),
        sa.Column("RequestedDate", sa.DateTime, nullable=False),
        sa.Column("Status", sa.String(length=20), nullable=False, server_default=sa.text("'Pending'")),
        sa.Column("CreatedAt", sa.DateTime, nullable=False, server_default=sa.text("GETUTCDATE()")),
        sa.Column("UpdatedAt", sa.DateTime, nullable=True),
        sa.CheckConstraint("Status IN ('Pending', 'Approved', 'Rejected')", name="CHK_VisitRequests_Status"),
    )
    op.create_index("IX_VisitRequests_RequestID", "VisitRequests", ["RequestID"], unique=False)
    op.create_index("IX_VisitRequests_PrisonerID", "VisitRequests", ["PrisonerID"], unique=False)
    op.create_index("IX_VisitRequests_ViewerID", "VisitRequests", ["ViewerID"], unique=False)
    op.create_index("IX_VisitRequests_Status", "VisitRequests", ["Status"], unique=False)


def downgrade() -> None:
    op.drop_index("IX_VisitRequests_Status", table_name="VisitRequests")
    op.drop_index("IX_VisitRequests_ViewerID", table_name="VisitRequests")
    op.drop_index("IX_VisitRequests_PrisonerID", table_name="VisitRequests")
    op.drop_index("IX_VisitRequests_RequestID", table_name="VisitRequests")
    op.drop_table("VisitRequests")
