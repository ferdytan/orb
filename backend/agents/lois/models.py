from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class InvoiceItem(BaseModel):
    description: str
    qty: int = 1
    unit_price: int
    total: int

class InvoiceCreate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_type: str = "invoice" # 'invoice', 'sales_order', 'purchase_order'
    customer_name: str
    customer_email: Optional[str] = ""
    issue_date: str
    due_date: str
    items: List[InvoiceItem]
    tax_amount: int = 0
    notes: Optional[str] = ""
    template_id: str = "modern"

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None # 'unpaid', 'paid', 'cancelled'
    notes: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_type: str
    customer_name: str
    customer_email: Optional[str] = ""
    issue_date: str
    due_date: str
    items: List[Dict[str, Any]]
    subtotal: int
    tax_amount: int
    total_amount: int
    status: str
    notes: Optional[str] = ""
    template_id: str
    email_sent: int
    email_sent_at: Optional[str] = None
    created_at: str
    updated_at: str

class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    address: Optional[str] = ""

class CustomerResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    address: Optional[str] = ""
    created_at: str

class SendEmailRequest(BaseModel):
    email_subject: Optional[str] = None
    custom_message: Optional[str] = None

class AskLoisRequest(BaseModel):
    message: str

class AskLoisResponse(BaseModel):
    text: str
    action: Optional[Dict[str, Any]] = None
