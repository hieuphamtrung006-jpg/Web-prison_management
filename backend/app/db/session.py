from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _ensure_sqlserver_tls_flags(database_url: str) -> str:
	# SQL Server ODBC Driver 18 enables encryption by default; local dev often needs trust flag.
	if not database_url.lower().startswith("mssql+pyodbc://"):
		return database_url

	lower = database_url.lower()
	has_encrypt = "encrypt=" in lower
	has_trust = "trustservercertificate=" in lower
	if has_encrypt and has_trust:
		return database_url

	separator = "&" if "?" in database_url else "?"
	parts: list[str] = []
	if not has_encrypt:
		parts.append("Encrypt=yes")
	if not has_trust:
		parts.append("TrustServerCertificate=yes")
	return f"{database_url}{separator}{'&'.join(parts)}"

engine = create_engine(
	_ensure_sqlserver_tls_flags(settings.database_url),
	future=True,
	pool_pre_ping=True,
	pool_recycle=1800,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_db_connection() -> bool:
	try:
		with engine.connect() as connection:
			connection.exec_driver_sql("SELECT 1")
		return True
	except Exception:
		return False
