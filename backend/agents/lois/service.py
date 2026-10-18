import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.database import get_connection

class LoisService:

    @staticmethod
    def list_invoices(status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM invoices WHERE 1=1"
        params = []
        
        if status and status != "all":
            query += " AND status = ?"
            params.append(status)
            
        if search:
            query += " AND (invoice_number LIKE ? OR customer_name LIKE ? OR notes LIKE ?)"
            s = f"%{search}%"
            params.extend([s, s, s])
            
        query += " ORDER BY id DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["items"] = json.loads(d.get("items_json") or "[]")
            except Exception:
                d["items"] = []
            result.append(d)
            
        conn.close()
        return result

    @staticmethod
    def get_invoice(invoice_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        try:
            d["items"] = json.loads(d.get("items_json") or "[]")
        except Exception:
            d["items"] = []
        return d

    @staticmethod
    def create_invoice(
        customer_name: str,
        issue_date: str,
        due_date: str,
        items: List[Dict[str, Any]],
        invoice_number: Optional[str] = None,
        invoice_type: str = "invoice",
        customer_email: str = "",
        tax_amount: int = 0,
        notes: str = "",
        template_id: str = "modern"
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        
        now = datetime.now()
        if not invoice_number:
            # Generate sequential invoice number: INV-YYYYMM-XXX
            prefix = f"INV-{now.strftime('%Y%m')}-"
            cursor.execute("SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE ?", (f"{prefix}%",))
            count = cursor.fetchone()[0] + 1
            invoice_number = f"{prefix}{count:03d}"
            
        subtotal = sum(int(item.get("qty", 1)) * int(item.get("unit_price", 0)) for item in items)
        total_amount = subtotal + int(tax_amount)
        items_json = json.dumps(items)
        now_str = now.isoformat()
        
        cursor.execute("""
        INSERT INTO invoices (
            invoice_number, invoice_type, customer_name, customer_email,
            issue_date, due_date, items_json, subtotal, tax_amount, total_amount,
            status, notes, template_id, email_sent, email_sent_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, 0, NULL, ?, ?)
        """, (
            invoice_number, invoice_type, customer_name, customer_email,
            issue_date, due_date, items_json, subtotal, tax_amount, total_amount,
            notes, template_id, now_str, now_str
        ))
        
        inv_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return LoisService.get_invoice(inv_id)

    @staticmethod
    def update_invoice(invoice_id: int, status: Optional[str] = None, notes: Optional[str] = None, due_date: Optional[str] = None) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if notes is not None:
            updates.append("notes = ?")
            params.append(notes)
        if due_date is not None:
            updates.append("due_date = ?")
            params.append(due_date)
            
        if not updates:
            conn.close()
            return LoisService.get_invoice(invoice_id)
            
        updates.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(invoice_id)
        
        cursor.execute(f"UPDATE invoices SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        conn.close()
        
        return LoisService.get_invoice(invoice_id)

    @staticmethod
    def mark_paid(invoice_id: int) -> Dict[str, Any]:
        inv = LoisService.update_invoice(invoice_id, status="paid")
        if not inv:
            return {"status": "error", "message": "Invoice tidak ditemukan"}
            
        # Generate cross-agent collaboration note for Fin
        fin_prompt = (
            f"Pembayaran {inv['invoice_number']} dari {inv['customer_name']} "
            f"sebesar Rp {inv['total_amount']:,} telah lunas. "
            f"Silakan catat sebagai pemasukan di Kas/Bank Fin."
        )
        
        return {
            "invoice": inv,
            "fin_note": fin_prompt,
            "fin_payload": {
                "type": "income",
                "amount": inv["total_amount"],
                "description": f"Pelunasan {inv['invoice_number']} - {inv['customer_name']}",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "customer": inv["customer_name"]
            }
        }

    @staticmethod
    def delete_invoice(invoice_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
        count = cursor.rowcount
        conn.commit()
        conn.close()
        return count > 0

    @staticmethod
    def send_email(invoice_id: int, subject: Optional[str] = None, custom_message: Optional[str] = None) -> Dict[str, Any]:
        inv = LoisService.get_invoice(invoice_id)
        if not inv:
            return {"status": "error", "message": "Invoice tidak ditemukan"}
            
        now_str = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE invoices SET email_sent = 1, email_sent_at = ?, updated_at = ?
        WHERE id = ?
        """, (now_str, now_str, invoice_id))
        conn.commit()
        conn.close()
        
        sub = subject or f"Tagihan Invoice #{inv['invoice_number']} dari Orb / Ferdy"
        msg = custom_message or (
            f"Halo {inv['customer_name']},\n\n"
            f"Terlampir rincian tagihan Invoice #{inv['invoice_number']} sebesar Rp {inv['total_amount']:,}.\n"
            f"Jatuh tempo pembayaran: {inv['due_date']}.\n\n"
            f"Silakan lakukan pembayaran sesuai ketentuan. Terima kasih atas kerja samanya!"
        )
        
        return {
            "status": "sent",
            "invoice_id": invoice_id,
            "invoice_number": inv["invoice_number"],
            "recipient_email": inv.get("customer_email") or "customer@example.com",
            "subject": sub,
            "message": msg,
            "sent_at": now_str
        }

    @staticmethod
    def list_customers() -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers ORDER BY name ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def create_customer(name: str, email: str = "", phone: str = "", company: str = "", address: str = "") -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO customers (name, email, phone, company, address, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (name, email, phone, company, address, now_str))
        cid = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": cid, "name": name, "email": email, "phone": phone, "company": company, "address": address, "created_at": now_str}

    @staticmethod
    def import_customers(customers_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now().isoformat()
        count = 0
        for c in customers_list:
            if not c.get("name"):
                continue
            cursor.execute("""
            INSERT INTO customers (name, email, phone, company, address, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (c.get("name"), c.get("email", ""), c.get("phone", ""), c.get("company", ""), c.get("address", ""), now_str))
            count += 1
        conn.commit()
        conn.close()
        return {"imported_count": count}

    @staticmethod
    def ask_lois(message: str) -> Dict[str, Any]:
        lower = message.lower()
        conn = get_connection()
        cursor = conn.cursor()
        
        # Summary counts
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'unpaid'")
        unpaid_count, unpaid_total = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'paid'")
        paid_count, paid_total = cursor.fetchone()
        conn.close()
        
        if "belum bayar" in lower or "unpaid" in lower or "tagihan" in lower or "status" in lower:
            reply = (
                f"Saat ini terdapat **{unpaid_count} invoice belum dibayar** dengan total tagihan "
                f"**Rp {unpaid_total:,}**.\n"
                f"Total invoice yang telah lunas berjumlah {paid_count} (Rp {paid_total:,}).\n"
                f"Gunakan menu **Daftar Invoice** untuk melihat rincian atau mengirim email reminder ke customer."
            )
            return {"text": reply, "action": {"type": "open_panel", "panel": "invoices"}}
            
        if "buat invoice" in lower or "tambah invoice" in lower or "order" in lower:
            reply = (
                f"Siap! Saya bisa membantu membuat invoice atau sales order baru. "
                f"Silakan klik tombol **+ Buat Invoice** di atas untuk mengisi data customer dan rincian item barang/jasa."
            )
            return {"text": reply, "action": {"type": "open_panel", "panel": "create_invoice"}}
            
        reply = (
            f"Halo! Saya Lois, asisten invoice & sales Anda. Saat ini tercatat {unpaid_count} invoice belum lunas (Rp {unpaid_total:,}). "
            f"Saya siap membantu membuat invoice baru, mengelola daftar customer, dan mengirim tagihan langsung via email."
        )
        return {"text": reply, "action": None}
