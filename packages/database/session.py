import os
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker

def get_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "restopia.db"))
    return f"sqlite:///{db_path}"

DATABASE_URL = get_database_url()
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@event.listens_for(SessionLocal, "after_begin")
def receive_after_begin(session, transaction, connection):
    """
    Automatically sets the RLS context whenever a new transaction starts (PostgreSQL).
    """
    if connection.dialect.name == "postgresql":
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
    Store tenant_id in session info and apply RLS context on PostgreSQL.
    """
    session.info["tenant_id"] = tenant_id
    try:
        bind = session.get_bind()
        if bind and bind.dialect.name == "postgresql":
            session.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))
    except Exception:
        pass
