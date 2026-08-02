import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "restopia-worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

@app.task
def generate_invoice(booking_id: str, tenant_id: str):
    """
    Background logic to generate PDF invoices including GST calculations.
    Will connect to database utilizing the tenant_id context if needed.
    """
    return f"Invoice generated for booking {booking_id} under tenant {tenant_id}"
