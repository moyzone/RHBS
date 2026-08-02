import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://restopia:restopia_password@localhost:5432/restopia")
engine = create_engine(DATABASE_URL)

def fix_nullable():
    commands = [
        "ALTER TABLE invoices ALTER COLUMN booking_id DROP NOT NULL"
    ]
    
    with engine.connect() as conn:
        print("Fixing booking_id nullable constraint...")
        for cmd in commands:
            try:
                conn.execute(text(cmd))
                conn.commit()
                print(f"Executed: {cmd}")
            except Exception as e:
                print(f"Error executing {cmd}: {e}")

if __name__ == "__main__":
    fix_nullable()
