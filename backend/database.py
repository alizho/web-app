"""
Database configuration and connection setup using SQLAlchemy Core.
"""
from sqlalchemy import create_engine, MetaData
from sqlalchemy.engine import Engine
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Local development fallback for the existing DB_* .env setup.
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "webapp_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine: Engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
)

# Metadata object for table definitions
metadata = MetaData()

def get_engine() -> Engine:
    """Get the database engine."""
    return engine

def get_metadata() -> MetaData:
    """Get the metadata object."""
    return metadata
