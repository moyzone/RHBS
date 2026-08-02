import sys
import os
from sqlalchemy import text
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Expanding Tenant and User tables for Admin Center...")
    try:
        with engine.connect() as conn:
            # Expand Tenants for Business Profile
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gst_number VARCHAR;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website VARCHAR;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name VARCHAR;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_number VARCHAR;"))
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR;"))
            
            # Expand Users for Admin Management
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'Manager';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Active';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR;")) # For panel logins
            
            conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
