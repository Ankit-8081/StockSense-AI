"""
Run this once to set up the database tables on Neon PostgreSQL.
Usage: python setup_db.py
"""
from database import engine, Base
import models  # noqa: F401 — imports all models so Base knows about them

def main():
    print("Creating all tables on PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Done! Tables created:")
    for table in Base.metadata.tables.keys():
        print(f"  ✓ {table}")

if __name__ == "__main__":
    main()
