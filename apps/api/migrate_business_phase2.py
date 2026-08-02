from sqlalchemy import text
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Migrating Phase 2 Business Profile fields...")
    cols = [
        "slogan", "short_name", "description", "currency", "show_header_in_print",
        "landline_number", "whatsapp_number",
        "booking_commission_pct", "card_processing_fee_pct", "transaction_fee",
        "internal_pg_api_key", "internal_pg_api_token", "internal_pg_public_key",
        "google_map_lat", "google_map_lng", "google_place_id",
        "social_facebook", "social_twitter", "social_instagram", "video_link"
    ]
    
    try:
        with engine.connect() as conn:
            for col in cols:
                conn.execute(text(f"ALTER TABLE tenants ADD COLUMN IF NOT EXISTS {col} TEXT;"))
            conn.commit()
        print("Phase 2 migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
