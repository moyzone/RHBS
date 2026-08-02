import sys
import os
from sqlalchemy import text
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Adding assigned_staff and maintenance_remarks columns to rooms table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE rooms ADD COLUMN assigned_staff VARCHAR;"))
            conn.execute(text("ALTER TABLE rooms ADD COLUMN maintenance_remarks VARCHAR;"))
            conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed (columns might already exist): {e}")

if __name__ == "__main__":
    migrate()
