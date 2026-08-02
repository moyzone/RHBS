import os
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker

DEFAULT_DB_URL = os.getenv("DATABASE_URL", "postgresql://restopia:restopia_password@localhost:5432/restopia")
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@event.listens_for(SessionLocal, "after_begin")
def receive_after_begin(session, transaction, connection):
    """
    Automatically sets the PostgreSQL RLS context whenever a new transaction starts.
    We retrieve the tenant_id from the session's info dictionary.
    """
    tenant_id = session.info.get("tenant_id")
    if tenant_id:
        connection.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def set_rls_context(session, tenant_id: str):
    """
    Store the tenant_id in the session's info dictionary.
    This triggers the 'after_begin' event and handles transaction boundaries.
    """
    session.info["tenant_id"] = tenant_id
    # Force a re-apply if a transaction is already active
    session.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))

