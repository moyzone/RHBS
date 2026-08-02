from sqlalchemy import text
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def migrate():
    print("Migrating all professional Business Profile fields...")
    cols = [
        "business_type", "business_sub_type", "vat_number", "seo_name",
        "address_street_number", "address_street_name", "address_city", 
        "address_state", "address_suburb", "address_locality", 
        "address_post_code", "address_country",
        "manager_first_name", "manager_last_name", "manager_phone",
        "wallet_first_name", "wallet_last_name", "wallet_phone", "wallet_provider", "wallet_url",
        "pg_gateway", "pg_callback_url", "pg_public_key", "pg_api_key"
    ]
    
    try:
        with engine.connect() as conn:
            for col in cols:
                conn.execute(text(f"ALTER TABLE tenants ADD COLUMN IF NOT EXISTS {col} TEXT;"))
            conn.commit()
        print("Business Profile migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
