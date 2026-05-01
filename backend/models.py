"""
database schema
tables: media, entries, emotions, entry_emotions, companions
"""
from sqlalchemy import Table, Column, Integer, String, Boolean, Date, ForeignKey, UniqueConstraint, Index
from database import metadata

media = Table(
    "media",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("title", String(200), nullable=False),
    Column("media_type", String(20), nullable=False),
    Column("url", String(500)),
    Column("genre", String(100)),
    Column("creator", String(150)),
    Column("release_year", Integer),
    
    Index("ix_media_media_type", "media_type"),
)

entries = Table(
    "entries",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("media_id", Integer, ForeignKey("media.id", ondelete="CASCADE"), nullable=False),
    Column("rating", Integer, nullable=False),
    Column("watched_at", Date, nullable=False),
    Column("rewatch", Boolean, default=False),

    Index("ix_entries_media_id", "media_id"),
    Index("ix_entries_watched_at", "watched_at"),
    Index("ix_entries_rating", "rating"),
)

emotions = Table(
    "emotions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(50), nullable=False),
    Column("valence", String(20), nullable=False),
    Column("image_path", String(300)), 
)

entry_emotions = Table(
    "entry_emotions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("entry_id", Integer, ForeignKey("entries.id", ondelete="CASCADE"), nullable=False),
    Column("emotion_id", Integer, ForeignKey("emotions.id", ondelete="CASCADE"), nullable=False),
    Column("intensity", Integer, nullable=False),
    UniqueConstraint("entry_id", "emotion_id", name="uq_entry_emotion"),

    Index("ix_entry_emotions_emotion_id", "emotion_id"),
)

companions = Table(
    "companions",  
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("entry_id", Integer, ForeignKey("entries.id", ondelete="CASCADE"), nullable=False),
    Column("name", String(100), nullable=False),
    Column("relationship", String(50), nullable=False),

    Index("ix_companions_entry_id", "entry_id"),
)
