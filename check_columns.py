import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://restopia:restopia_password@localhost:5432/restopia")
engine = create_engine(DATABASE_URL)

def check_nullable():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'booking_id'"))
        print(res.fetchall())

if __name__ == "__main__":
    check_nullable()
