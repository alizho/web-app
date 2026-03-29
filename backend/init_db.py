"""
Initialize database: create tables and seed sample data for Media Tracker.
Run once: python init_db.py
"""
from sqlalchemy import text
from datetime import date
from database import engine, metadata
from models import media, entries, emotions, entry_emotions, companions

def init_db():
    """Create all tables and insert sample data."""
    # Drop old schema tables if migrating from student app
    with engine.begin() as conn:
        for table in ["entry_emotions", "companions", "entries", "emotions", "media",
                      "enrollments", "courses", "students"]:
            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))

    metadata.create_all(engine)

    with engine.begin() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM emotions"))
        if result.scalar() > 0:
            print("Database already seeded. Skipping.")
            return

        conn.execute(emotions.insert(), [
            {"name": "joy", "valence": "positive", "image_path": "joy.png"},
            {"name": "anger", "valence": "negative", "image_path": "anger.png"},
            {"name": "disgust", "valence": "negative", "image_path": "disgust.png"},
            {"name": "inspired", "valence": "positive", "image_path": None},
            {"name": "fear", "valence": "negative", "image_path": "fear.png"},
            {"name": "calm", "valence": "positive", "image_path": None},
            {"name": "excited", "valence": "positive", "image_path": "excited.png"},
            {"name": "sad", "valence": "negative", "image_path": "sad.png"},
            {"name": "hopeful", "valence": "positive", "image_path": None},
        ])

        # Seed media
        conn.execute(media.insert(), [
            {"title": "Past Lives", "media_type": "film", "genre": "drama", "creator": "Celine Song", "release_year": 2023},
            {"title": "Dune: Part Two", "media_type": "film", "genre": "sci-fi", "creator": "Denis Villeneuve", "release_year": 2024},
            {"title": "The Way of Kings", "media_type": "book", "genre": "fantasy", "creator": "Brandon Sanderson", "release_year": 2010},
        ])

        # Seed entries
        conn.execute(entries.insert(), [
            {"media_id": 1, "rating": 5, "watched_at": date(2024, 2, 15), "rewatch": False},
            {"media_id": 2, "rating": 4, "watched_at": date(2024, 3, 1), "rewatch": False},
            {"media_id": 3, "rating": 4, "watched_at": date(2024, 1, 20), "rewatch": True},
        ])

        # Seed entry_emotions (entry 1: joy+fear, entry 2: excited, entry 3: anger+hopeful)
        conn.execute(entry_emotions.insert(), [
            {"entry_id": 1, "emotion_id": 1, "intensity": 5},
            {"entry_id": 1, "emotion_id": 5, "intensity": 4},
            {"entry_id": 2, "emotion_id": 7, "intensity": 4},
            {"entry_id": 3, "emotion_id": 2, "intensity": 3},
            {"entry_id": 3, "emotion_id": 9, "intensity": 4},
        ])

        # Seed companions
        conn.execute(companions.insert(), [
            {"entry_id": 1, "name": "Jadden", "relationship": "friend"},
            {"entry_id": 2, "name": "Solo", "relationship": "solo"},
            {"entry_id": 3, "name": "Solo", "relationship": "solo"},
        ])

        print("Media Tracker database initialized with sample data.")

if __name__ == "__main__":
    init_db()
