import sys
import os
from sqlalchemy import text
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Creating staff table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS staff (
                    id VARCHAR PRIMARY KEY,
                    tenant_id VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    email VARCHAR,
                    phone VARCHAR,
                    role VARCHAR NOT NULL DEFAULT 'Housekeeping',
                    status VARCHAR NOT NULL DEFAULT 'Active',
                    designation VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
                );
            """))
            conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
