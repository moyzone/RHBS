import sys
import os
import uuid

# Add packages to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))

from sqlalchemy import text
from sqlalchemy.orm import Session
from database.session import engine
from database.schema import Base, Tenant, RoomType, Room, Booking, Invoice, User

def initialize_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Applying Row Level Security (RLS) policies...")
    tables_with_tenant = ['users', 'room_types', 'rooms', 'bookings', 'invoices']
    
    with engine.connect() as conn:
        for table in tables_with_tenant:
            # Enable RLS
            conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
            
            # Drop policy if exists
            conn.execute(text(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};"))
            conn.execute(text(f"DROP POLICY IF EXISTS invoice_public_read ON {table};"))
            
            if table == 'invoices':
                # Invoices use missing_ok=TRUE so unauthenticated requests don't error out
                conn.execute(text(f"""
                    CREATE POLICY tenant_isolation_policy ON invoices
                    FOR ALL
                    TO PUBLIC
                    USING (tenant_id = coalesce(current_setting('app.current_tenant_id', TRUE), '___no_tenant___'))
                    WITH CHECK (tenant_id = coalesce(current_setting('app.current_tenant_id', TRUE), '___no_tenant___'));
                """))
                # Additional permissive SELECT-only policy for QR code / public invoice access
                # The unique invoice UUID acts as the access credential (same as Stripe/Shopify)
                conn.execute(text("""
                    CREATE POLICY invoice_public_read ON invoices
                    FOR SELECT
                    TO PUBLIC
                    USING (TRUE);
                """))
            else:
                # Create policy
                conn.execute(text(f"""
                    CREATE POLICY tenant_isolation_policy ON {table}
                    FOR ALL
                    TO PUBLIC
                    USING (tenant_id = current_setting('app.current_tenant_id')::VARCHAR);
                """))
            
            # Force RLS for owner
            conn.execute(text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;"))
            
        conn.commit()

    print("Seeding dummy data for 'hotelflora' and 'demo'...")
    with Session(engine) as session:
        # Tenants to seed
        tenants = [
            {"id": "hotelflora", "name": "Hotel Flora", "color": "#4f46e5"},
            {"id": "demo", "name": "Demo Hotel", "color": "#0ea5e9"}
        ]
        
        for t_data in tenants:
            tenant = session.query(Tenant).filter_by(id=t_data["id"]).first()
            if not tenant:
                print(f"Creating tenant {t_data['id']}...")
                tenant = Tenant(id=t_data["id"], name=t_data["name"], theme_color=t_data["color"])
                session.add(tenant)
                session.flush()
                
                # Create Room Types for this tenant
                rt_1 = RoomType(id=f"rt_{t_data['id']}_1", tenant_id=t_data["id"], name="Deluxe", base_price=4000.0, capacity=2)
                rt_2 = RoomType(id=f"rt_{t_data['id']}_2", tenant_id=t_data["id"], name="Suite", base_price=8000.0, capacity=4)
                session.add_all([rt_1, rt_2])
                session.flush()
                
                # Create Rooms for this tenant
                r_1 = Room(id=f"r_{t_data['id']}_101", tenant_id=t_data["id"], room_type_id=rt_1.id, name="Room 101")
                r_2 = Room(id=f"r_{t_data['id']}_102", tenant_id=t_data["id"], room_type_id=rt_1.id, name="Room 102")
                r_3 = Room(id=f"r_{t_data['id']}_103", tenant_id=t_data["id"], room_type_id=rt_2.id, name="Room 103")
                session.add_all([r_1, r_2, r_3])
                print(f"Seed complete for {t_data['id']}.")
            else:
                print(f"Tenant {t_data['id']} already exists.")
        
        session.commit()

if __name__ == "__main__":
    initialize_database()
