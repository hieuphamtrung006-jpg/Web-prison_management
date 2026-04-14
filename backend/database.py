from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import urllib

# 1. Chỉ cần 3 thông số này
SERVER = 'localhost'  # Hoặc tên máy của Phú
DATABASE = 'PRISON'
DRIVER = 'ODBC Driver 18 for SQL Server'

# 2. Chuỗi kết nối dùng "Trusted_Connection=yes"
# Đây là chìa khóa để vào thẳng mà không cần pass
connection_string = (
    f"DRIVER={{{DRIVER}}};"
    f"SERVER={SERVER};"
    f"DATABASE={DATABASE};"
    f"Trusted_Connection=yes;"
)

params = urllib.parse.quote_plus(connection_string)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

# 3. Khởi tạo engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()