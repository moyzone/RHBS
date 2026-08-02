import sys
import os
from sqlalchemy import text
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Migrating Guest CRM changes...")
    with engine.connect() as conn:
        try:
            # Create guests table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS guests (
                    id VARCHAR PRIMARY KEY,
                    tenant_id VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    email VARCHAR,
                    phone VARCHAR NOT NULL,
                    id_proof_image_url VARCHAR,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("Table 'guests' created or already exists.")
            
            # Add guest_email to bookings
            try:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN guest_email VARCHAR;"))
                print("Column 'guest_email' added to 'bookings'.")
            except Exception as e:
                print(f"Skipping guest_email (might exist): {e}")

            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
