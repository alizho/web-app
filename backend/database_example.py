"""
Example usage of SQLAlchemy Core database connection.
This file demonstrates how to use the database setup in your FastAPI routes.
"""
from sqlalchemy import text
from database import engine, get_engine

# Example 1: Simple query using engine.connect()
def example_query():
    """Example of executing a raw SQL query."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()
        print(f"PostgreSQL version: {version[0]}")
        return version[0]

# Example 2: Using get_engine() function
def example_with_get_engine():
    """Example using the get_engine() helper function."""
    db_engine = get_engine()
    with db_engine.connect() as conn:
        result = conn.execute(text("SELECT current_database()"))
        db_name = result.fetchone()
        print(f"Current database: {db_name[0]}")
        return db_name[0]

# Example 3: Testing database connection
def test_connection():
    """Test if database connection works."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("Database connection successful!")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

if __name__ == "__main__":
    # Run examples
    print("Testing database connection...")
    if test_connection():
        example_query()
        example_with_get_engine()
