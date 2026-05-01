# Media Tracker Application (CS 348)
## Live Deployment

Hosted on the cloud with Render:  [Live Demo Site](https://web-app-front-3i1e.onrender.com/)

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL + SQLAlchemy Core

---
## Local Development Setup

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


## Project Structure

```
web-app/
├── backend/
│   ├── main.py              # FastAPI application + API routes
│   ├── models.py            # DB tables: media, entries, emotions, entry_emotions, companions
│   ├── init_db.py           # Create tables and seed data (run once)
│   ├── database.py          # SQLAlchemy Core database configuration
│   ├── requirements.txt    # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Media Tracker UI: CRUD, filter/report, dynamic media/emotion dropdowns
│   │   └── ...
│   └── package.json
└── README.md
```

## AI Usage
1. **Which AI tools were used**
- I mainly used Claude Sonnet and ChatGPT.
2. **What tasks the AI assisted with**
- Debugging issues when I got stuck, including errors during database setup and configuration.
- Generating/improving code snippets (for example creating CSS variables for UI color themes and generating redundant code for similar funtions.)
- Generate the initial sample database content so I did not have to manually type out data.
- Explaining error messages and troubleshooting efficiency issues.
3. **How I verified or modified the AI-generated output**
- For verifying output, I cross-checked technical claims and code against official documentation out there, including SQLAlchemy, FastAPI, and PostgreSQL. I also researched independently and tested outputs to confirm correctness. Any generated code was modified and understood by me to fit my project requirements and application logic rather than being copied directly.