from sqlalchemy import text
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Migrating Phase 3 POS and Theming fields...")
    cols = [
        "pos_system_name", "pos_api_key", "business_image_url", "property_service_list"
    ]
    
    try:
        with engine.connect() as conn:
            for col in cols:
                conn.execute(text(f"ALTER TABLE tenants ADD COLUMN IF NOT EXISTS {col} TEXT;"))
            conn.commit()
        print("Phase 3 migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
