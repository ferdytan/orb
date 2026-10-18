"""FastAPI APIRouter for Lois - Invoice, Sales & Purchase Order Agent."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.agents.lois.models import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    CustomerCreate, CustomerResponse, SendEmailRequest,
    AskLoisRequest, AskLoisResponse
)
from backend.agents.lois.service import LoisService

router = APIRouter(prefix="/api/agents/lois", tags=["Lois Agent"])

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(status: Optional[str] = Query(None), search: Optional[str] = Query(None)):
    return LoisService.list_invoices(status=status, search=search)

@router.post("/invoices", response_model=InvoiceResponse)
def create_invoice(body: InvoiceCreate):
    items_data = [item.model_dump() for item in body.items]
    inv = LoisService.create_invoice(
        customer_name=body.customer_name,
        issue_date=body.issue_date,
        due_date=body.due_date,
        items=items_data,
        invoice_number=body.invoice_number,
        invoice_type=body.invoice_type,
        customer_email=body.customer_email or "",
        tax_amount=body.tax_amount,
        notes=body.notes or "",
        template_id=body.template_id or "modern"
    )
    if not inv:
        raise HTTPException(status_code=400, detail="Gagal membuat invoice")
    return inv

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_detail(invoice_id: int):
    inv = LoisService.get_invoice(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    return inv

@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: int, body: InvoiceUpdate):
    inv = LoisService.update_invoice(
        invoice_id=invoice_id,
        status=body.status,
        notes=body.notes,
        due_date=body.due_date
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    return inv

@router.post("/invoices/{invoice_id}/pay")
def mark_invoice_as_paid(invoice_id: int):
    res = LoisService.mark_paid(invoice_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res

@router.post("/invoices/{invoice_id}/send-email")
def send_invoice_email(invoice_id: int, body: Optional[SendEmailRequest] = None):
    subject = body.email_subject if body else None
    msg = body.custom_message if body else None
    res = LoisService.send_email(invoice_id, subject=subject, custom_message=msg)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res

@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int):
    success = LoisService.delete_invoice(invoice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    return {"status": "deleted", "id": invoice_id}

@router.get("/customers", response_model=List[CustomerResponse])
def get_customers():
    return LoisService.list_customers()

@router.post("/customers", response_model=CustomerResponse)
def create_customer(body: CustomerCreate):
    return LoisService.create_customer(
        name=body.name,
        email=body.email or "",
        phone=body.phone or "",
        company=body.company or "",
        address=body.address or ""
    )

@router.post("/customers/import")
def import_customers(body: List[CustomerCreate]):
    items = [c.model_dump() for c in body]
    return LoisService.import_customers(items)

@router.post("/ask", response_model=AskLoisResponse)
def ask_lois(body: AskLoisRequest):
    return LoisService.ask_lois(body.message)
