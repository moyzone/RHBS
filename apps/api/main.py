import sys
import os
import uuid
import jwt
import json
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from fastapi import FastAPI, Depends, Request, HTTPException, File, UploadFile, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import shutil

sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))
from database.session import get_db, set_rls_context
from database.schema import RoomType, Room, Booking, Invoice, Payment, Guest, Staff, Tenant, User
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from init_db import initialize_database

app = FastAPI(title="Restopia API")
security = HTTPBearer()

# Enable CORS for localhost Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def on_startup():
    print("Running database initialization...")
    initialize_database()

JWT_SECRET = "super_secret_jwt_key"

def get_user_context(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if not payload.get("user_id") or not payload.get("tenant_id"):
            raise HTTPException(status_code=401, detail="Invalid JWT payload")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


# ---- Pydantic Schemas ----
class RoomTypeCreate(BaseModel):
    name: str; base_price: float; capacity: int

class RoomCreate(BaseModel):
    name: str; room_type_id: str; housekeeping_status: Optional[str] = "Clean"

class BookingCreate(BaseModel):
    room_id: str
    guest_name: str
    guest_contact: Optional[str]
    check_in: str
    check_out: str
    total_price: float
    amount_paid: float = 0.0
    payment_method: Optional[str] = "UPI"
    booking_source: Optional[str] = "Offline"
    guest_email: Optional[str] = None
    guest_id_proof_image_url: Optional[str] = None

class PaymentCreate(BaseModel):
    amount: float
    method: str
    notes: Optional[str] = None

class PaymentUpdate(BaseModel):
    method: str

class RoomTypeUpdate(BaseModel):
    name: Optional[str] = None
    base_price: Optional[float] = None
    capacity: Optional[int] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    room_type_id: Optional[str] = None
    housekeeping_status: Optional[str] = None
    assigned_staff: Optional[str] = None
    maintenance_remarks: Optional[str] = None

class StatusUpdate(BaseModel):
    status: Optional[str] = None
    assigned_staff: Optional[str] = None
    maintenance_remarks: Optional[str] = None

class BookingUpdate(BaseModel):
    check_out: Optional[str] = None
    booking_source: Optional[str] = None
    payment_method: Optional[str] = None
    room_id: Optional[str] = None
    total_price: Optional[float] = None

class InvoiceItem(BaseModel):
    description: str
    amount: float

class InvoiceCreate(BaseModel):
    booking_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    customer_email: Optional[str] = None
    subtotal: Optional[float] = None
    gst_percentage: Optional[float] = 12.0
    gst_amount: Optional[float] = None
    total_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    paid_amount: Optional[float] = 0.0
    balance_amount: Optional[float] = 0.0
    payment_mode: Optional[str] = None
    due_date: Optional[str] = None
    bill_notes: Optional[str] = None
    items: Optional[List[dict]] = None
    custom_subtotal: Optional[float] = None

class StaffCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "Housekeeping"
    designation: Optional[str] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    designation: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    business_type: Optional[str] = None
    business_sub_type: Optional[str] = None
    slogan: Optional[str] = None
    short_name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    show_header_in_print: Optional[str] = None
    gst_number: Optional[str] = None
    vat_number: Optional[str] = None
    seo_name: Optional[str] = None
    phone: Optional[str] = None
    landline_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    business_image_url: Optional[str] = None
    property_service_list: Optional[str] = None
    address_street_number: Optional[str] = None
    address_street_name: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_suburb: Optional[str] = None
    address_locality: Optional[str] = None
    address_post_code: Optional[str] = None
    address_country: Optional[str] = None
    manager_first_name: Optional[str] = None
    manager_last_name: Optional[str] = None
    manager_phone: Optional[str] = None
    wallet_first_name: Optional[str] = None
    wallet_last_name: Optional[str] = None
    wallet_phone: Optional[str] = None
    wallet_provider: Optional[str] = None
    wallet_url: Optional[str] = None
    pg_gateway: Optional[str] = None
    pg_callback_url: Optional[str] = None
    pg_public_key: Optional[str] = None
    pg_api_key: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    
    # Advanced Payments (Fees)
    booking_commission_pct: Optional[str] = None
    card_processing_fee_pct: Optional[str] = None
    transaction_fee: Optional[str] = None
    internal_pg_api_key: Optional[str] = None
    internal_pg_api_token: Optional[str] = None
    internal_pg_public_key: Optional[str] = None

    pos_system_name: Optional[str] = None
    pos_api_key: Optional[str] = None

    # Digital & Mapping
    google_map_lat: Optional[str] = None
    google_map_lng: Optional[str] = None
    google_place_id: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_instagram: Optional[str] = None
    video_link: Optional[str] = None

class AdminUserCreate(BaseModel):
    email: str
    name: str
    role: str
    password: Optional[str] = None

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

# ---- REAL ENDPOINTS ----
@app.post("/api/dev/token")
def generate_mock_token(tenant_id: str = "hotelflora"):
    """
    Utility endpoint to fetch a valid JWT token during local non-DB dev.
    """
    token = jwt.encode({"user_id": "u_test", "tenant_id": tenant_id}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "tenant_id": tenant_id, "theme_color": "#0ea5e9"} # Sky blue theme mock

@app.get("/api/dashboard/stats")
def get_dashboard_stats(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    
    total_rooms = db.query(Room).count()
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Bookings with check_in on or before today and check_out on or after today
    checked_in_bookings = db.query(Booking).filter(
        Booking.status == "Checked-in",
        Booking.check_in <= today_end,
        Booking.check_out >= today_start
    ).all()
    
    # Check-ins today
    checkins_today = db.query(Booking).filter(
        Booking.check_in >= today_start,
        Booking.check_in <= today_end
    ).count()

    occupied_count = len(checked_in_bookings)
    occupancy_rate = round((occupied_count / total_rooms * 100), 1) if total_rooms > 0 else 0.0
    
    # Active guests count
    active_guests = occupied_count
    
    # Housekeeping summary
    dirty_rooms = db.query(Room).filter(Room.housekeeping_status == "Dirty").count()
    clean_rooms = db.query(Room).filter(Room.housekeeping_status == "Clean").count()
    cleaning_rooms = db.query(Room).filter(Room.housekeeping_status == "Cleaning").count()
    
    # Total revenue today from payments
    today_payments = db.query(Payment).filter(
        Payment.timestamp >= today_start,
        Payment.timestamp <= today_end
    ).all()
    today_revenue = sum(p.amount for p in today_payments)

    total_bookings = db.query(Booking).count()

    return {
        "checkins_today": checkins_today,
        "occupancy_rate": occupancy_rate,
        "occupied_rooms": occupied_count,
        "total_rooms": total_rooms,
        "active_guests": active_guests,
        "dirty_rooms": dirty_rooms,
        "clean_rooms": clean_rooms,
        "cleaning_rooms": cleaning_rooms,
        "today_revenue": today_revenue,
        "total_bookings": total_bookings
    }

@app.get("/api/room-types")
def get_room_types(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    return db.query(RoomType).all()

@app.post("/api/room-types")
def create_room_type(req: RoomTypeCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    new_rt = RoomType(
        id=f"rt_{uuid.uuid4().hex[:8]}",
        tenant_id=context["tenant_id"],
        name=req.name,
        base_price=req.base_price,
        capacity=req.capacity
    )
    db.add(new_rt)
    db.commit()
    db.refresh(new_rt)
    return new_rt

@app.patch("/api/room-types/{rt_id}")
def update_room_type(rt_id: str, req: RoomTypeUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    rt = db.query(RoomType).filter(RoomType.id == rt_id).first()
    if not rt:
        raise HTTPException(404, "Room type not found")
    
    if req.name is not None: rt.name = req.name
    if req.base_price is not None: rt.base_price = req.base_price
    if req.capacity is not None: rt.capacity = req.capacity
    
    db.commit()
    db.refresh(rt)
    return rt

@app.delete("/api/room-types/{rt_id}")
def delete_room_type(rt_id: str, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    rt = db.query(RoomType).filter(RoomType.id == rt_id).first()
    if not rt:
        raise HTTPException(404, "Room type not found")
    
    # Check for dependent rooms
    room_count = db.query(Room).filter(Room.room_type_id == rt_id).count()
    if room_count > 0:
        raise HTTPException(400, f"Cannot delete room type because it has {room_count} physical rooms assigned to it.")

    db.delete(rt)
    db.commit()
    return {"message": "Deleted successfully"}

@app.get("/api/rooms")
def get_rooms(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    return db.query(Room).all()

@app.post("/api/rooms")
def create_room(req: RoomCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    new_room = Room(
        id=f"r_{uuid.uuid4().hex[:8]}",
        tenant_id=context["tenant_id"],
        room_type_id=req.room_type_id,
        name=req.name
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@app.patch("/api/rooms/{room_id}")
def update_room(room_id: str, req: RoomUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    
    if req.name is not None: room.name = req.name
    if req.room_type_id is not None: room.room_type_id = req.room_type_id
    
    db.commit()
    db.refresh(room)
    return room

@app.patch("/api/rooms/{room_id}/housekeeping")
def update_room_housekeeping(room_id: str, req: StatusUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    
    if req.status is not None: room.housekeeping_status = req.status
    if req.assigned_staff is not None: room.assigned_staff = req.assigned_staff
    if req.maintenance_remarks is not None: room.maintenance_remarks = req.maintenance_remarks
    
    db.commit()
    db.refresh(room)
    return room

@app.delete("/api/rooms/{room_id}")
def delete_room(room_id: str, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    
    # Check for dependent bookings
    booking_count = db.query(Booking).filter(Booking.room_id == room_id).count()
    if booking_count > 0:
        raise HTTPException(400, f"Cannot delete room because it has {booking_count} bookings associated with it.")

    db.delete(room)
    db.commit()
    return {"message": "Deleted successfully"}

@app.get("/api/bookings")
def get_bookings(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    # Use joinedload to ensure payments are included in the JSON response
    bookings = db.query(Booking).options(joinedload(Booking.payments)).all()
    return bookings

@app.post("/api/bookings")
def create_booking(req: BookingCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    new_booking = Booking(
        id=f"b_{uuid.uuid4().hex[:8]}",
        tenant_id=context["tenant_id"],
        room_id=req.room_id,
        guest_name=req.guest_name,
        guest_contact=req.guest_contact,
        check_in=datetime.fromisoformat(req.check_in.replace("Z", "+00:00")),
        check_out=datetime.fromisoformat(req.check_out.replace("Z", "+00:00")),
        status="Confirmed",
        total_price=req.total_price,
        booking_source=req.booking_source,
        guest_email=req.guest_email
    )
    db.add(new_booking)

    # Upsert Guest Profile for CRM
    guest = db.query(Guest).filter(Guest.tenant_id == context["tenant_id"], Guest.phone == req.guest_contact).first()
    if guest:
        guest.name = req.guest_name
        if req.guest_email: guest.email = req.guest_email
        if req.guest_id_proof_image_url: guest.id_proof_image_url = req.guest_id_proof_image_url
    else:
        guest = Guest(
            id=f"g_{uuid.uuid4().hex[:8]}",
            tenant_id=context["tenant_id"],
            name=req.guest_name,
            phone=req.guest_contact,
            email=req.guest_email,
            id_proof_image_url=req.guest_id_proof_image_url
        )
        db.add(guest)
    
    # Create the initial payment record if any
    if req.amount_paid > 0:
        initial_payment = Payment(
            id=f"p_{uuid.uuid4().hex[:8]}",
            tenant_id=context["tenant_id"],
            booking_id=new_booking.id,
            amount=req.amount_paid,
            method=req.payment_method or "UPI",
            timestamp=datetime.utcnow()
        )
        db.add(initial_payment)

    db.commit()
    # Refresh with joinedload to ensure payments are available in the response
    booking_with_payments = db.query(Booking).options(joinedload(Booking.payments)).filter(Booking.id == new_booking.id).first()
    return booking_with_payments

@app.post("/api/bookings/{booking_id}/payments")
def add_payment(booking_id: str, req: PaymentCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    
    new_payment = Payment(
        id=f"p_{uuid.uuid4().hex[:8]}",
        tenant_id=context["tenant_id"],
        booking_id=booking_id,
        amount=req.amount,
        method=req.method,
        notes=req.notes,
        timestamp=datetime.utcnow()
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment

@app.patch("/api/payments/{payment_id}")
def update_payment(payment_id: str, req: PaymentUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    payment.method = req.method
    db.commit()
    db.refresh(payment)
    return payment

@app.put("/api/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, req: StatusUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    booking = db.query(Booking).options(joinedload(Booking.payments)).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    
    # Automatically mark room as Dirty when guest checks out, or Occupied when guest checks in
    if req.status == "Checked-out":
        total_paid = sum(p.amount for p in (booking.payments or []))
        balance = (booking.total_price or 0.0) - total_paid
        if balance > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot checkout booking with pending balance of ₹{balance:.2f}"
            )

        room = db.query(Room).filter(Room.id == booking.room_id).first()
        if room:
            room.housekeeping_status = "Dirty"
    elif req.status == "Checked-in":
        room = db.query(Room).filter(Room.id == booking.room_id).first()
        if room:
            room.housekeeping_status = "Occupied"

    booking.status = req.status
    db.commit()
    db.refresh(booking)
    return booking

@app.patch("/api/bookings/{booking_id}")
def update_booking(booking_id: str, req: BookingUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    
    if req.check_out is not None:
        booking.check_out = datetime.fromisoformat(req.check_out.replace("Z", "+00:00"))
    if req.booking_source is not None:
        booking.booking_source = req.booking_source
    if req.payment_method is not None:
        booking.payment_method = req.payment_method
    if req.room_id is not None:
        booking.room_id = req.room_id
    if req.total_price is not None:
        booking.total_price = req.total_price
        
    db.commit()
    booking_with_payments = db.query(Booking).options(joinedload(Booking.payments)).filter(Booking.id == booking_id).first()
    return booking_with_payments

@app.post("/api/bookings/{booking_id}/invoice")
def generate_gst_invoice(booking_id: str, req: Optional[InvoiceCreate] = Body(None), context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != "Checked-out":
        raise HTTPException(400, "Can only invoice checking out bookings")
    
    # Handle line items if provided, otherwise fallback to subtotal or booking price
    line_items_data = []
    if req and req.items:
        for item in req.items:
            if isinstance(item, dict):
                desc = item.get("description") or item.get("name") or "Product/Service"
                amt = float(item.get("amount", 0.0))
            else:
                desc = getattr(item, "description", "Product/Service")
                amt = float(getattr(item, "amount", 0.0))
            line_items_data.append({"description": desc, "amount": amt})
        subtotal = float(req.subtotal) if (req and req.subtotal is not None) else sum(item["amount"] for item in line_items_data)
    elif req and req.subtotal is not None:
        subtotal = float(req.subtotal)
        line_items_data = [{"description": "Accommodation Services", "amount": subtotal}]
    elif req and req.custom_subtotal is not None:
        subtotal = float(req.custom_subtotal)
        line_items_data = [{"description": "Accommodation Services", "amount": subtotal}]
    else:
        subtotal = float(booking.total_price)
        line_items_data = [{"description": "Accommodation Services", "amount": subtotal}]

    bill_notes = req.bill_notes if req else None

    rate = float(req.gst_percentage) if (req and req.gst_percentage is not None) else (18.0 if subtotal >= 7500 else 5.0)
    gst_amount = float(req.gst_amount) if (req and req.gst_amount is not None) else (float(subtotal) * (rate / 100.0))
    total = float(req.total_amount) if (req and req.total_amount is not None) else (float(subtotal) + gst_amount)
    tax = float(req.tax_amount) if (req and req.tax_amount is not None) else gst_amount
    
    inv = Invoice(
        id=f"inv_{uuid.uuid4().hex[:8]}",
        tenant_id=context["tenant_id"],
        booking_id=booking.id,
        subtotal=subtotal,
        gst_percentage=rate,
        gst_amount=gst_amount,
        total_amount=total,
        tax_amount=tax,
        bill_notes=bill_notes,
        line_items=json.dumps(line_items_data)
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    
    # Return as dict to ensure line_items is parsed for the frontend
    return {
        "id": inv.id,
        "tenant_id": inv.tenant_id,
        "booking_id": inv.booking_id,
        "subtotal": inv.subtotal,
        "gst_percentage": inv.gst_percentage,
        "gst_amount": inv.gst_amount,
        "total_amount": inv.total_amount,
        "created_at": str(inv.created_at) if inv.created_at else None,
        "bill_notes": inv.bill_notes,
        "line_items": line_items_data,
        "booking": {
            "guest_name": booking.guest_name,
            "guest_contact": booking.guest_contact,
            "room": {"id": booking.room_id, "name": "Room"} # Basic fallback info
        }
    }

@app.post("/api/upload-id")
async def upload_guest_id(file: UploadFile = File(...), context: dict = Depends(get_user_context)):
    """Uploads a guest's ID proof image and returns its relative URL."""
    ext = file.filename.split('.')[-1]
    filename = f"id_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join("uploads", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the publicly accessible URL (assuming frontend can access /uploads)
    return {"url": f"/uploads/{filename}"}

@app.post("/api/invoices")
def create_universal_invoice(req: InvoiceCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    try:
        set_rls_context(db, context["tenant_id"])
        
        items_list = req.items or []
        calculated_subtotal = req.subtotal if req.subtotal is not None else sum(float(item.get("amount", 0.0)) for item in items_list if isinstance(item, dict))
        calculated_gst_pct = req.gst_percentage if req.gst_percentage is not None else 12.0
        calculated_gst_amt = req.gst_amount if req.gst_amount is not None else (calculated_subtotal * calculated_gst_pct / 100.0)
        calculated_total = req.total_amount if req.total_amount is not None else (calculated_subtotal + calculated_gst_amt)
        calculated_tax = req.tax_amount if req.tax_amount is not None else calculated_gst_amt

        new_invoice = Invoice(
            id=f"inv_{uuid.uuid4().hex[:8]}",
            tenant_id=context["tenant_id"],
            booking_id=req.booking_id,
            customer_name=req.customer_name,
            customer_contact=req.customer_contact,
            customer_email=req.customer_email,
            subtotal=calculated_subtotal,
            gst_percentage=calculated_gst_pct,
            gst_amount=calculated_gst_amt,
            total_amount=calculated_total,
            tax_amount=calculated_tax,
            paid_amount=req.paid_amount if req.paid_amount is not None else 0.0,
            balance_amount=req.balance_amount if req.balance_amount is not None else 0.0,
            payment_mode=req.payment_mode,
            due_date=datetime.fromisoformat(req.due_date.replace("Z", "+00:00")) if req.due_date else None,
            bill_notes=req.bill_notes,
            line_items=json.dumps(items_list)
        )
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)
        return new_invoice
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Invoice create error: {str(e)}")

@app.get("/api/invoices")
def get_invoices(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    """Fetch all invoices (standalone or booking-linked) for this tenant."""
    try:
        set_rls_context(db, context["tenant_id"])
        results = db.execute(text("""
            SELECT 
                i.id, i.tenant_id, i.booking_id,
                i.subtotal, i.gst_percentage, i.gst_amount, i.total_amount, i.tax_amount,
                i.paid_amount, i.balance_amount, i.payment_mode, i.due_date,
                i.created_at, i.bill_notes, i.line_items,
                i.customer_name as standalone_guest, i.customer_contact as standalone_contact,
                b.guest_name as booking_guest, b.guest_contact as booking_contact,
                r.name as room_name
            FROM invoices i
            LEFT JOIN bookings b ON b.id = i.booking_id
            LEFT JOIN rooms r ON r.id = b.room_id
            WHERE i.tenant_id = :tenant_id
            ORDER BY i.created_at DESC NULLS LAST
        """), {"tenant_id": context["tenant_id"]}).fetchall()

        return [
            {
                "id": row.id,
                "tenant_id": row.tenant_id,
                "booking_id": row.booking_id,
                "subtotal": row.subtotal,
                "gst_percentage": row.gst_percentage,
                "gst_amount": row.gst_amount,
                "total_amount": row.total_amount,
                "tax_amount": row.tax_amount,
                "paid_amount": row.paid_amount,
                "balance_amount": row.balance_amount,
                "payment_mode": row.payment_mode,
                "due_date": str(row.due_date) if row.due_date else None,
                "created_at": str(row.created_at) if row.created_at else None,
                "bill_notes": row.bill_notes,
                "line_items": json.loads(row.line_items) if row.line_items else [],
                "booking": {
                    "guest_name": row.booking_guest or row.standalone_guest,
                    "guest_contact": row.booking_contact or row.standalone_contact,
                    "room": {"id": "N/A", "name": row.room_name or "Direct Sale"}
                }
            }
            for row in results
        ]
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Invoice fetch error: {type(e).__name__}: {str(e)}\n{traceback.format_exc()}")

@app.get("/api/public/invoices/{id}")
def get_public_invoice(id: str):
    """Publicly accessible: fetch a single invoice using raw SQL to bypass RLS session events."""
    from database.session import engine
    from sqlalchemy import text as sql_text

    with engine.connect() as conn:
        # Temporarily disable RLS for this connection by setting a known tenant
        # First, get the tenant_id from the invoice with no RLS context issue
        # We use PostgreSQL's SET LOCAL to set a dummy value just to read the tenant_id
        try:
            conn.execute(sql_text("SET app.current_tenant_id = ''"))
        except Exception:
            pass  # ignore if already set

        # Read just the tenant_id directly (invoice_public_read policy allows this)
        row = conn.execute(sql_text(
            "SELECT tenant_id FROM invoices WHERE id = :id"
        ), {"id": id}).fetchone()

        if not row:
            raise HTTPException(404, "Invoice not found")

        tenant_id = row[0]

        # Now set the correct tenant and fetch everything we need in one query
        conn.execute(sql_text(f"SET app.current_tenant_id = '{tenant_id}'"))

        result = conn.execute(sql_text("""
            SELECT 
                i.id, i.tenant_id, i.booking_id, 
                i.subtotal, i.gst_percentage, i.gst_amount, i.total_amount,
                i.bill_notes, i.line_items,
                b.guest_name, b.guest_contact, b.guest_email,
                b.check_in, b.check_out, b.total_price, b.booking_source, b.status,
                r.name as room_name,
                r.id as room_id
            FROM invoices i
            JOIN bookings b ON b.id = i.booking_id
            JOIN rooms r ON r.id = b.room_id
            WHERE i.id = :id
        """), {"id": id}).fetchone()

        if not result:
            raise HTTPException(404, "Invoice data not available")

        return {
            "id": result.id,
            "tenant_id": result.tenant_id,
            "booking_id": result.booking_id,
            "subtotal": result.subtotal,
            "gst_percentage": result.gst_percentage,
            "gst_amount": result.gst_amount,
            "total_amount": result.total_amount,
            "bill_notes": result.bill_notes,
            "line_items": json.loads(result.line_items) if result.line_items else [],
            "booking": {
                "guest_name": result.guest_name,
                "guest_contact": result.guest_contact,
                "guest_email": result.guest_email,
                "check_in": str(result.check_in),
                "check_out": str(result.check_out),
                "total_price": result.total_price,
                "booking_source": result.booking_source,
                "status": result.status,
                "room": {
                    "id": result.room_id,
                    "name": result.room_name
                }
            }
        }

@app.get("/api/guests")
def get_guests(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    return db.query(Guest).all()

@app.get("/api/guests/{phone}/bookings")
def get_guest_bookings(phone: str, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    """Fetches all bookings for a guest by their phone number."""
    set_rls_context(db, context["tenant_id"])
    return db.query(Booking).options(joinedload(Booking.room)).filter(Booking.guest_contact == phone).all()

# ---- STAFF ENDPOINTS ----
@app.get("/api/staff")
def get_staff(context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    return db.query(Staff).all()

@app.post("/api/staff")
def create_staff(req: StaffCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    new_staff = Staff(
        id=f"staff_{uuid.uuid4().hex[:8]}",
        tenant_id=context["tenant_id"],
        name=req.name,
        email=req.email,
        phone=req.phone,
        role=req.role,
        designation=req.designation
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff

@app.patch("/api/staff/{staff_id}")
def update_staff(staff_id: str, req: StaffUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")
    
    if req.name is not None: staff.name = req.name
    if req.email is not None: staff.email = req.email
    if req.phone is not None: staff.phone = req.phone
    if req.role is not None: staff.role = req.role
    if req.status is not None: staff.status = req.status
    if req.designation is not None: staff.designation = req.designation
    
    db.commit()
    db.refresh(staff)
    return staff

@app.delete("/api/staff/{staff_id}")
def delete_staff(staff_id: str, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    set_rls_context(db, context["tenant_id"])
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")
    db.delete(staff)
    db.commit()
    return {"success": True}

# --- ADMIN CENTER / SETTINGS ---
@app.get("/api/{tenant_id}/settings")
async def get_settings(tenant_id: str, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant: raise HTTPException(404, "Tenant not found")
    return tenant

@app.patch("/api/{tenant_id}/settings")
async def update_settings(tenant_id: str, data: TenantUpdate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant: raise HTTPException(404, "Tenant not found")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tenant, key, value)
    
    db.commit()
    db.refresh(tenant)
    return tenant

@app.get("/api/{tenant_id}/admin-users")
async def get_admin_users(tenant_id: str, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    return users

@app.post("/api/{tenant_id}/admin-users")
async def create_admin_user(tenant_id: str, data: AdminUserCreate, context: dict = Depends(get_user_context), db: Session = Depends(get_db)):
    new_user = User(
        id=f"user_{int(datetime.utcnow().timestamp())}",
        tenant_id=tenant_id,
        email=data.email,
        name=data.name,
        role=data.role,
        password=data.password,
        status="Active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
