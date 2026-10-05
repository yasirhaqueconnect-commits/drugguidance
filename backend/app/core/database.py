"""
Database Session and Connection Management.
Configures SQLAlchemy engine, connection pooling, and request-scoped session dependencies.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.normalized_database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yields a database session and safely closes it upon request completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes all registered SQLAlchemy models in the target database."""
    # Import all models to ensure metadata registration before create_all
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
