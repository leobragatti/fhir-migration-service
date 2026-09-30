import os
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Mapped, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fhir_migration.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

default_utc = lambda: datetime.now(timezone.utc).replace(tzinfo=None)


class Patient(Base):
    __tablename__ = "patient"

    id: Mapped[str] = mapped_column(
        primary_key=True, index=True
    )  # Column(String, primary_key=True, index=True)
    identifier: Mapped[str] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=True)
    birth_date: Mapped[str] = mapped_column(String, nullable=True)
    gender: Mapped[str] = mapped_column(String, nullable=True)
    telecom_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=default_utc, onupdate=default_utc
    )
    observations: Mapped[list["Observation"]] = relationship(back_populates="patient")


class Observation(Base):
    __tablename__ = "observation"

    id: Mapped[str] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(nullable=True)
    display: Mapped[str] = mapped_column(nullable=True)
    value_text: Mapped[str] = mapped_column(nullable=True)
    effective_datetime: Mapped[datetime] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=True, default=default_utc, onupdate=default_utc
    )

    patient_id: Mapped[str] = mapped_column(ForeignKey("patient.id"))
    patient: Mapped["Patient"] = relationship(back_populates="observations")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
