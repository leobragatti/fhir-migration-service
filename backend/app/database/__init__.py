import os
from collections.abc import Generator
from contextlib import contextmanager

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Database configuration is missing")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Yield a session and close it afterwards. Use as a FastAPI dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Same session lifecycle as get_db, for code outside FastAPI (e.g. RQ jobs):
#     with db_session() as db: ...
db_session = contextmanager(get_db)
