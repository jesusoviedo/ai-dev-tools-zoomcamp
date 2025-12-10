"""Database configuration and session management."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from typing import Generator

# Get database URL from environment variable
# Default to SQLite, but can be switched to PostgreSQL by setting DATABASE_URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sessions.db"  # SQLite database file in current directory
)

# Create engine
# For SQLite, we need check_same_thread=False for FastAPI
# For PostgreSQL, this is not needed
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False  # Set to True for SQL query logging
    )
else:
    # PostgreSQL or other databases
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        echo=False
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables.
    
    Call this function on application startup to create tables.
    """
    Base.metadata.create_all(bind=engine)


def drop_db():
    """
    Drop all database tables.
    
    Use with caution - this will delete all data!
    """
    Base.metadata.drop_all(bind=engine)

