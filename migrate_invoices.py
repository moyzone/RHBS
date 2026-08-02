import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://restopia:restopia_password@localhost:5432/restopia")
engine = create_engine(DATABASE_URL)

def migrate():
    commands = [
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name VARCHAR",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_contact VARCHAR",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_email VARCHAR",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount FLOAT",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount FLOAT",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_amount FLOAT",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_mode VARCHAR",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMP"
    ]
    
    with engine.connect() as conn:
        print("Applying migrations using IF NOT EXISTS...")
        for cmd in commands:
            try:
                conn.execute(text(cmd))
                conn.commit()
                print(f"Executed: {cmd}")
            except Exception as e:
                print(f"Error executing {cmd}: {e}")

if __name__ == "__main__":
    migrate()
