# Web Application - Stage 1 & 2

Stage 1: Minimal "Hello World" web application.  
Stage 2: **Media Tracker** — log media, emotions, companions. Database: media, entries, emotions, entry_emotions, companions. CRUD, filtering/reporting, dynamic UI from DB.

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL + SQLAlchemy Core

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8 or higher
- pip (Python package manager)
- PostgreSQL (v12 or higher)

### Database Setup (PostgreSQL)

**Important**: PostgreSQL is installed at the **system level** (not in the venv). The Python packages that connect to PostgreSQL are installed in the venv.

1. **Install PostgreSQL** (system-level installation):
   - **macOS**: `brew install postgresql@15` (run this OUTSIDE the venv)
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib` (Ubuntu/Debian)
   - **Windows**: Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)

2. **Start PostgreSQL service** (system-level service):
   - **macOS**: `brew services start postgresql@15` (run this OUTSIDE the venv)
   - **Linux**: `sudo systemctl start postgresql`
   - **Windows**: PostgreSQL service should start automatically

3. **Create a database**:
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database
   CREATE DATABASE webapp_db;
   
   # Create user (optional, or use default postgres user)
   CREATE USER webapp_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE webapp_db TO webapp_user;
   
   # Exit psql
   \q
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database connection**:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your PostgreSQL credentials
   # Update DB_NAME, DB_USER, DB_PASSWORD as needed
   ```

5. **Initialize the database (Stage 2)** — create tables and seed data:
   ```bash
   python init_db.py
   ```

6. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## Running the Application

1. **Start the backend** (in one terminal):
   ```bash
   cd backend
   source venv/bin/activate  # If using virtual environment
   uvicorn main:app --reload
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

   You should see "Hello world" displayed on the page, fetched from the backend API.

## API Endpoints

- `GET /api/hello` - Returns `{"message": "Hello world"}`
- **Media Tracker (Stage 2)**
  - `GET /api/media` - List media (for dynamic dropdown)
  - `POST /api/media` - Create media
  - `GET /api/emotions` - List emotions (for dynamic dropdown)
  - `GET /api/entries` - List entries; optional: `rating_min`, `rating_max`, `date_from`, `date_to`, `media_type`
  - `POST /api/entries` - Create entry (media_id, rating, watched_at, rewatch, emotions, companions)
  - `GET /api/entries/{id}` - Get one entry
  - `PUT /api/entries/{id}` - Update entry
  - `DELETE /api/entries/{id}` - Delete entry

## Project Structure

```
web-app/
├── backend/
│   ├── main.py              # FastAPI application + API routes
│   ├── models.py            # DB tables: media, entries, emotions, entry_emotions, companions
│   ├── init_db.py           # Create tables and seed data (run once)
│   ├── database.py          # SQLAlchemy Core database configuration
│   ├── database_example.py  # Example usage
│   ├── requirements.txt    # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Media Tracker UI: CRUD, filter/report, dynamic media/emotion dropdowns
│   │   └── ...
│   └── package.json
└── README.md
```

## Database Configuration

The project uses SQLAlchemy Core for database operations. Database configuration is managed through environment variables in `backend/.env`:

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: webapp_db)
- `DB_USER`: PostgreSQL user (default: postgres)
- `DB_PASSWORD`: PostgreSQL password

The database connection is set up in `backend/database.py` and can be imported in your FastAPI routes:

```python
from database import engine, metadata, get_engine

# Use engine for raw SQL queries or SQLAlchemy Core operations
with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM your_table"))
```

## Verification

To verify everything is working:

1. Backend should respond at `http://localhost:8000/api/hello` with:
   ```json
   {"message": "hello, world!"}
   ```

2. Frontend should display "hello, world!" on the page.

3. Check browser console for any errors (should be none).

## PostgreSQL & SQLAlchemy Core Setup

The project is configured to use PostgreSQL with SQLAlchemy Core. Here's how to get it ready:

### Quick Setup Steps

**Important**: PostgreSQL itself is installed at the **system level** (not in venv). The Python packages that connect to PostgreSQL are installed in the venv.

**Step 1-2: System-level PostgreSQL** (run these OUTSIDE the venv):
1. **Install PostgreSQL** (if not installed):
   - macOS: `brew install postgresql@15`
   - Linux: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Start PostgreSQL service**:
   - macOS: `brew services start postgresql@15`
   - Linux: `sudo systemctl start postgresql`

**Step 3: Create database** (run `psql` OUTSIDE the venv):
3. **Create database**:
   ```bash
   psql postgres
   CREATE DATABASE webapp_db;
   \q
   ```

**Step 4-6: Python setup** (run these INSIDE the venv):
4. **Activate virtual environment**:
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

5. **Install Python dependencies** (installs PostgreSQL adapter packages in venv):
   ```bash
   pip install -r requirements.txt
   ```

6. **Configure environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

7. **Test database connection** (with venv activated):
   ```bash
   python database_example.py
   ```

### Using the Database in Your Code

Import the database engine and metadata in your FastAPI routes:

```python
from database import engine, metadata, get_engine
from sqlalchemy import text

@app.get("/api/test-db")
def test_db():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()
        return {"postgresql_version": version[0]}
```

See `backend/database_example.py` for more usage examples.
