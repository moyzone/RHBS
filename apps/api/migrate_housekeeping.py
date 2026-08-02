import sys
import os
from sqlalchemy import text
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Adding housekeeping_status column to rooms table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE rooms ADD COLUMN housekeeping_status VARCHAR NOT NULL DEFAULT 'Clean';"))
            conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed (it might already exist): {e}")

if __name__ == "__main__":
    migrate()
