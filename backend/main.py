import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select, insert, update, delete
from typing import Optional
from datetime import date

from database import engine
from models import media, entries, emotions, entry_emotions, companions

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# --- Pydantic models ---

class MediaCreate(BaseModel):
    title: str
    media_type: str
    url: Optional[str] = None
    genre: Optional[str] = None
    creator: Optional[str] = None
    release_year: Optional[int] = None

class MediaUpdate(BaseModel):
    title: Optional[str] = None
    media_type: Optional[str] = None
    url: Optional[str] = None
    genre: Optional[str] = None
    creator: Optional[str] = None
    release_year: Optional[int] = None

class EntryEmotionCreate(BaseModel):
    emotion_id: int
    intensity: int

class CompanionCreate(BaseModel):
    name: str
    relationship: str

class EntryCreate(BaseModel):
    media_id: int
    rating: int
    watched_at: str
    rewatch: bool = False
    emotions: list[EntryEmotionCreate] = []
    companions: list[CompanionCreate] = []

class EntryUpdate(BaseModel):
    rating: Optional[int] = None
    watched_at: Optional[str] = None
    rewatch: Optional[bool] = None
    emotions: Optional[list[EntryEmotionCreate]] = None
    companions: Optional[list[CompanionCreate]] = None


def _emotion_row_to_dict(r):
    d = {"id": r["id"], "name": r["name"], "valence": r["valence"], "image_path": r["image_path"]}
    if d["image_path"]:
        d["image_url"] = f"/uploads/{d['image_path']}"
    else:
        d["image_url"] = None
    return d


# --- media: CRUD ---

@app.get("/api/media")
def list_media():
    with engine.connect() as conn:
        result = conn.execute(select(media).order_by(media.c.title))
        rows = result.mappings().all()
    return [
        {"id": r["id"], "title": r["title"], "media_type": r["media_type"],
         "url": r["url"], "genre": r["genre"], "creator": r["creator"], "release_year": r["release_year"]}
        for r in rows
    ]


@app.post("/api/media")
def create_media(data: MediaCreate):
    with engine.begin() as conn:
        result = conn.execute(
            insert(media).values(
                title=data.title, media_type=data.media_type, url=data.url or None,
                genre=data.genre or None, creator=data.creator or None, release_year=data.release_year
            ).returning(media)
        )
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")
    return {"id": row["id"], "title": row["title"], "media_type": row["media_type"],
            "url": row["url"], "genre": row["genre"], "creator": row["creator"], "release_year": row["release_year"]}


@app.put("/api/media/{media_id}")
def update_media(media_id: int, data: MediaUpdate):
    values = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    for k in ("url", "genre", "creator"):
        if k in values and values[k] == "":
            values[k] = None
    if not values:
        raise HTTPException(status_code=400, detail="No fields to update")
    with engine.begin() as conn:
        result = conn.execute(
            update(media).where(media.c.id == media_id).values(**values).returning(media)
        )
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"id": row["id"], "title": row["title"], "media_type": row["media_type"],
            "url": row["url"], "genre": row["genre"], "creator": row["creator"], "release_year": row["release_year"]}


@app.delete("/api/media/{media_id}")
def delete_media(media_id: int):
    with engine.begin() as conn:
        result = conn.execute(delete(media).where(media.c.id == media_id).returning(media.c.id))
        if result.mappings().first() is None:
            raise HTTPException(status_code=404, detail="Media not found")
    return {"ok": True}


# --- emotions: CRUD + image upload ---

@app.get("/api/emotions")
def list_emotions():
    with engine.connect() as conn:
        result = conn.execute(select(emotions).order_by(emotions.c.name))
        rows = result.mappings().all()
    return [_emotion_row_to_dict(r) for r in rows]


@app.post("/api/emotions")
def create_emotion(
    name: str = Form(...),
    valence: str = Form(...),
    image: Optional[UploadFile] = File(None),
):
    if valence not in ("positive", "negative", "mixed"):
        raise HTTPException(status_code=400, detail="valence must be positive, negative, or mixed")
    image_path = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp"):
            raise HTTPException(status_code=400, detail="Only PNG/JPG/WebP images allowed")
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_path = filename
    with engine.begin() as conn:
        result = conn.execute(
            insert(emotions).values(name=name.strip().lower(), valence=valence, image_path=image_path).returning(emotions)
        )
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")
    return _emotion_row_to_dict(row)


@app.put("/api/emotions/{emotion_id}")
def update_emotion(
    emotion_id: int,
    name: Optional[str] = Form(None),
    valence: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    remove_image: Optional[str] = Form(None),
):
    values = {}
    if name is not None:
        values["name"] = name.strip().lower()
    if valence is not None:
        if valence not in ("positive", "negative", "mixed"):
            raise HTTPException(status_code=400, detail="valence must be positive, negative, or mixed")
        values["valence"] = valence

    if remove_image == "true":
        with engine.connect() as conn:
            old = conn.execute(select(emotions.c.image_path).where(emotions.c.id == emotion_id)).scalar()
        if old:
            (UPLOAD_DIR / old).unlink(missing_ok=True)
        values["image_path"] = None
    elif image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp"):
            raise HTTPException(status_code=400, detail="Only PNG/JPG/WebP images allowed")
        with engine.connect() as conn:
            old = conn.execute(select(emotions.c.image_path).where(emotions.c.id == emotion_id)).scalar()
        if old:
            (UPLOAD_DIR / old).unlink(missing_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(image.file, f)
        values["image_path"] = filename

    if not values:
        raise HTTPException(status_code=400, detail="No fields to update")

    with engine.begin() as conn:
        result = conn.execute(
            update(emotions).where(emotions.c.id == emotion_id).values(**values).returning(emotions)
        )
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Emotion not found")
    return _emotion_row_to_dict(row)


@app.delete("/api/emotions/{emotion_id}")
def delete_emotion(emotion_id: int):
    with engine.begin() as conn:
        old = conn.execute(select(emotions.c.image_path).where(emotions.c.id == emotion_id)).scalar()
        if old:
            (UPLOAD_DIR / old).unlink(missing_ok=True)
        result = conn.execute(delete(emotions).where(emotions.c.id == emotion_id).returning(emotions.c.id))
        if result.mappings().first() is None:
            raise HTTPException(status_code=404, detail="Emotion not found")
    return {"ok": True}


# --- companions: unique names ---

@app.get("/api/companions/unique")
def list_unique_companions():
    with engine.connect() as conn:
        result = conn.execute(
            select(companions.c.name).distinct().order_by(companions.c.name)
        )
        return [row["name"] for row in result.mappings().all()]


# --- entries: CRUD + filter/report ---

def _entry_to_dict(entry_row, media_row, emotion_rows, companion_rows):
    return {
        "id": entry_row["id"],
        "media_id": entry_row["media_id"],
        "media_title": media_row["title"] if media_row else None,
        "media_type": media_row["media_type"] if media_row else None,
        "rating": entry_row["rating"],
        "watched_at": str(entry_row["watched_at"]),
        "rewatch": entry_row["rewatch"],
        "emotions": [
            {"emotion_id": r["emotion_id"], "name": r.get("emotion_name"),
             "image_url": r.get("emotion_image_url"), "intensity": r["intensity"]}
            for r in emotion_rows
        ],
        "companions": [{"name": r["name"], "relationship": r["relationship"]} for r in companion_rows],
    }


def _load_entry_details(conn, entry_id):
    ee_stmt = (
        select(
            entry_emotions,
            emotions.c.name.label("emotion_name"),
            emotions.c.image_path.label("emotion_image_path"),
        )
        .join(emotions, entry_emotions.c.emotion_id == emotions.c.id)
        .where(entry_emotions.c.entry_id == entry_id)
    )
    ee_rows = []
    for x in conn.execute(ee_stmt).mappings().all():
        d = dict(x)
        d["emotion_image_url"] = f"/uploads/{d['emotion_image_path']}" if d.get("emotion_image_path") else None
        ee_rows.append(d)
    comp_rows = [dict(x) for x in conn.execute(select(companions).where(companions.c.entry_id == entry_id)).mappings().all()]
    return ee_rows, comp_rows


@app.get("/api/entries")
def list_entries(
    rating_min: Optional[int] = None,
    rating_max: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    media_type: Optional[str] = None,
    companion: Optional[str] = None,
    emotion_id: Optional[int] = None,
):
    stmt = (
        select(entries, media)
        .join(media, entries.c.media_id == media.c.id)
    )
    if rating_min is not None:
        stmt = stmt.where(entries.c.rating >= rating_min)
    if rating_max is not None:
        stmt = stmt.where(entries.c.rating <= rating_max)
    if date_from:
        stmt = stmt.where(entries.c.watched_at >= date_from)
    if date_to:
        stmt = stmt.where(entries.c.watched_at <= date_to)
    if media_type:
        stmt = stmt.where(media.c.media_type == media_type)
    if companion:
        stmt = stmt.where(
            entries.c.id.in_(
                select(companions.c.entry_id).where(companions.c.name.ilike(f"%{companion}%"))
            )
        )
    if emotion_id is not None:
        stmt = stmt.where(
            entries.c.id.in_(
                select(entry_emotions.c.entry_id).where(entry_emotions.c.emotion_id == emotion_id)
            )
        )
    stmt = stmt.order_by(entries.c.watched_at.desc())

    out = []
    with engine.connect() as conn:
        rows = conn.execute(stmt).mappings().all()
        for r in rows:
            e = dict(r)
            ee_rows, comp_rows = _load_entry_details(conn, e["id"])
            out.append(_entry_to_dict(
                {"id": e["id"], "media_id": e["media_id"], "rating": e["rating"],
                 "watched_at": e["watched_at"], "rewatch": e["rewatch"]},
                {"title": e["title"], "media_type": e["media_type"]},
                ee_rows, comp_rows,
            ))
    return out


@app.get("/api/entries/{entry_id}")
def get_entry(entry_id: int):
    with engine.connect() as conn:
        row = conn.execute(
            select(entries, media).join(media, entries.c.media_id == media.c.id).where(entries.c.id == entry_id)
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Entry not found")
        e = dict(row)
        ee_rows, comp_rows = _load_entry_details(conn, entry_id)
        return _entry_to_dict(
            {"id": e["id"], "media_id": e["media_id"], "rating": e["rating"],
             "watched_at": e["watched_at"], "rewatch": e["rewatch"]},
            {"title": e["title"], "media_type": e["media_type"]},
            ee_rows, comp_rows,
        )


@app.post("/api/entries")
def create_entry(data: EntryCreate):
    try:
        watched = date.fromisoformat(data.watched_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="watched_at must be YYYY-MM-DD")
    if not (1 <= data.rating <= 5):
        raise HTTPException(status_code=400, detail="rating must be 1-5")

    with engine.begin() as conn:
        result = conn.execute(
            insert(entries).values(
                media_id=data.media_id, rating=data.rating,
                watched_at=watched, rewatch=data.rewatch
            ).returning(entries)
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=500, detail="Insert failed")
        entry_id = row["id"]

        for em in data.emotions:
            if 1 <= em.intensity <= 5:
                conn.execute(
                    insert(entry_emotions).values(
                        entry_id=entry_id, emotion_id=em.emotion_id, intensity=em.intensity
                    )
                )
        for c in data.companions:
            conn.execute(
                insert(companions).values(
                    entry_id=entry_id, name=c.name, relationship=c.relationship
                )
            )

    return {"id": entry_id, "ok": True}


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: int, data: EntryUpdate):
    payload = data.model_dump(exclude_unset=True)
    emotions_data = payload.pop("emotions", None)
    companions_data = payload.pop("companions", None)

    values = payload
    if "watched_at" in values:
        try:
            values["watched_at"] = date.fromisoformat(values["watched_at"])
        except ValueError:
            raise HTTPException(status_code=400, detail="watched_at must be YYYY-MM-DD")
    if "rating" in values and not (1 <= values["rating"] <= 5):
        raise HTTPException(status_code=400, detail="rating must be 1-5")
    if not values and emotions_data is None and companions_data is None:
        raise HTTPException(status_code=400, detail="No fields to update")

    with engine.begin() as conn:
        exists = conn.execute(select(entries.c.id).where(entries.c.id == entry_id)).scalar()
        if not exists:
            raise HTTPException(status_code=404, detail="Entry not found")
        if values:
            conn.execute(update(entries).where(entries.c.id == entry_id).values(**values))
        if emotions_data is not None:
            conn.execute(delete(entry_emotions).where(entry_emotions.c.entry_id == entry_id))
            for em in emotions_data:
                if 1 <= em["intensity"] <= 5:
                    conn.execute(insert(entry_emotions).values(
                        entry_id=entry_id, emotion_id=em["emotion_id"], intensity=em["intensity"]
                    ))
        if companions_data is not None:
            conn.execute(delete(companions).where(companions.c.entry_id == entry_id))
            for c in companions_data:
                conn.execute(insert(companions).values(
                    entry_id=entry_id, name=c["name"], relationship=c["relationship"]
                ))
    return {"ok": True}


@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int):
    with engine.begin() as conn:
        result = conn.execute(delete(entries).where(entries.c.id == entry_id).returning(entries.c.id))
        if result.mappings().first() is None:
            raise HTTPException(status_code=404, detail="Entry not found")
    return {"ok": True}


@app.get("/")
def read_root():
    return {"message": "Media Tracker API"}

@app.get("/api/hello")
def hello():
    return {"message": "hello, world!"}
