from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship, backref
from datetime import datetime

Base = declarative_base()

class Tenant(Base):
    __tablename__ = 'tenants'
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    theme_color = Column(String, nullable=True, default="#4f46e5")
    
    # Business Details
    business_type = Column(String, nullable=True) # e.g. Accommodation
    business_sub_type = Column(String, nullable=True) # e.g. Homestays
    slogan = Column(String, nullable=True)
    short_name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    show_header_in_print = Column(String, nullable=True) # Boolean stored as str for simplicity or use Boolean
    gst_number = Column(String, nullable=True)
    vat_number = Column(String, nullable=True)
    seo_name = Column(String, nullable=True)
    
    # Contact & Brand
    phone = Column(String, nullable=True)
    landline_number = Column(String, nullable=True)
    whatsapp_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    business_image_url = Column(String, nullable=True)
    property_service_list = Column(String, nullable=True)
    
    # Detailed Address
    address_street_number = Column(String, nullable=True)
    address_street_name = Column(String, nullable=True)
    address_city = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_suburb = Column(String, nullable=True)
    address_locality = Column(String, nullable=True)
    address_post_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)
    
    # Business Manager
    manager_first_name = Column(String, nullable=True)
    manager_last_name = Column(String, nullable=True)
    manager_phone = Column(String, nullable=True)
    
    # Mobile Wallet Information
    wallet_first_name = Column(String, nullable=True)
    wallet_last_name = Column(String, nullable=True)
    wallet_phone = Column(String, nullable=True)
    wallet_provider = Column(String, nullable=True)
    wallet_url = Column(String, nullable=True)
    
    # Payment Gateway Information
    pg_gateway = Column(String, nullable=True)
    pg_callback_url = Column(String, nullable=True)
    pg_public_key = Column(String, nullable=True)
    pg_api_key = Column(String, nullable=True)
    
    # Old bank fields kept for compatibility or merged
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)

    # Advanced Payments (Fees)
    booking_commission_pct = Column(String, nullable=True)
    card_processing_fee_pct = Column(String, nullable=True)
    transaction_fee = Column(String, nullable=True)
    internal_pg_api_key = Column(String, nullable=True)
    internal_pg_api_token = Column(String, nullable=True)
    internal_pg_public_key = Column(String, nullable=True)

    # POS Sync Options
    pos_system_name = Column(String, nullable=True)
    pos_api_key = Column(String, nullable=True)

    # Digital & Mapping
    google_map_lat = Column(String, nullable=True)
    google_map_lng = Column(String, nullable=True)
    google_place_id = Column(String, nullable=True)
    social_facebook = Column(String, nullable=True)
    social_twitter = Column(String, nullable=True)
    social_instagram = Column(String, nullable=True)
    video_link = Column(String, nullable=True)


class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="Manager")
    status = Column(String, nullable=False, default="Active")
    password = Column(String, nullable=True)

class RoomType(Base):
    __tablename__ = 'room_types'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    name = Column(String, nullable=False)
    base_price = Column(Float, nullable=False, default=0.0)
    capacity = Column(Integer, nullable=False, default=2)
    
class Room(Base):
    __tablename__ = 'rooms'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    room_type_id = Column(String, ForeignKey('room_types.id'), nullable=False)
    name = Column(String, nullable=False)
    housekeeping_status = Column(String, nullable=False, default="Clean") # Clean, Dirty, Cleaning, Inspected
    assigned_staff = Column(String, nullable=True) # John, Sara, etc.
    maintenance_remarks = Column(String, nullable=True) # AC Repair, Tap leaking, etc.

class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    room_id = Column(String, ForeignKey('rooms.id'), nullable=False)
    guest_name = Column(String, nullable=False)
    guest_contact = Column(String, nullable=True)
    guest_email = Column(String, nullable=True)
    
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=False)
    
    status = Column(String, nullable=False, default="Confirmed") # Confirmed, Checked-in, Checked-out, Cancelled
    total_price = Column(Float, nullable=False, default=0.0)
    booking_source = Column(String, nullable=True) # MakeMyTrip, Airbnb, Offline, etc.
    
    # Relationship to payments
    payments = relationship("Payment", backref="booking", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    booking_id = Column(String, ForeignKey('bookings.id'), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=False) # Cash, UPI, Online
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(String, nullable=True)

class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    booking_id = Column(String, ForeignKey('bookings.id'), nullable=True) # Now optional for standalone sales
    
    # Standalone Customer Info (Fallback if no booking_id)
    customer_name = Column(String, nullable=True)
    customer_contact = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)

    # Extended Financials
    subtotal = Column(Float, nullable=False)
    gst_percentage = Column(Float, nullable=False) # e.g., 5.0 or 18.0
    gst_amount = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=True) # Snapshot of extra taxes
    paid_amount = Column(Float, default=0.0)
    balance_amount = Column(Float, default=0.0)

    payment_mode = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    bill_notes = Column(String, nullable=True)
    line_items = Column(String, nullable=True) # JSON-encoded list of rich items

class Guest(Base):
    __tablename__ = 'guests'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    id_proof_image_url = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Staff(Base):
    __tablename__ = 'staff'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey('tenants.id'), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="Housekeeping") # Housekeeping, Maintenance, Front Desk, Manager
    status = Column(String, nullable=False, default="Active") # Active, Inactive
    designation = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
