import sys
import os
from sqlalchemy import text
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import engine

def cleanup():
    print("Dropping bookings and invoices tables...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS invoices CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS bookings CASCADE;"))
        conn.commit()
    print("Tables dropped.")

if __name__ == "__main__":
    cleanup()
