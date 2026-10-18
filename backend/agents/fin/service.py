"""Fin Agent Service - Pure Integer Arithmetic & Financial Domain Logic."""

import sqlite3
import csv
import io
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from backend.database import get_connection
from backend.agents.fin.reporting import FinSnapshotService


class FinService:

    @staticmethod
    def get_current_period() -> str:
        return datetime.now().strftime("%Y-%m")

    @staticmethod
    def get_current_date() -> str:
        return datetime.now().strftime("%Y-%m-%d")

    # =========================================================================
    # ACCOUNTS
    # =========================================================================

    @classmethod
    def list_accounts(cls, active_only: bool = True) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        query = "SELECT * FROM fin_accounts"
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY id ASC"
        cursor.execute(query)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def create_account(cls, name: str, account_type: str = "cash", initial_balance: int = 0,
                       currency: str = "IDR", icon: str = "👛", color: str = "#10B981",
                       bank_name: Optional[str] = None, account_number: Optional[str] = None) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO fin_accounts (name, account_type, balance, initial_balance, currency, icon, color, is_active, bank_name, account_number, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
        """, (name, account_type, int(initial_balance), int(initial_balance), currency, icon, color, bank_name, account_number, now, now))
        acc_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM fin_accounts WHERE id = ?", (acc_id,))
        acc = dict(cursor.fetchone())
        conn.close()
        return acc

    @classmethod
    def get_account(cls, account_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fin_accounts WHERE id = ?", (account_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    # =========================================================================
    # CATEGORIES
    # =========================================================================

    @classmethod
    def list_categories(cls, cat_type: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        if cat_type:
            cursor.execute("SELECT * FROM fin_categories WHERE type = ? ORDER BY sort_order ASC, name ASC", (cat_type,))
        else:
            cursor.execute("SELECT * FROM fin_categories ORDER BY type DESC, sort_order ASC, name ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # =========================================================================
    # TRANSACTIONS
    # =========================================================================

    @classmethod
    def list_transactions(cls, period: Optional[str] = None, tx_type: Optional[str] = None,
                          account_id: Optional[int] = None, limit: int = 100) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        query = """
            SELECT t.*, 
                   a.name AS account_name,
                   da.name AS destination_account_name,
                   c.name AS category_name,
                   c.icon AS category_icon,
                   c.color AS category_color
            FROM fin_transactions t
            LEFT JOIN fin_accounts a ON t.account_id = a.id
            LEFT JOIN fin_accounts da ON t.destination_account_id = da.id
            LEFT JOIN fin_categories c ON t.category_id = c.id
            WHERE 1=1
        """
        params = []
        if period:
            query += " AND t.date LIKE ?"
            params.append(f"{period}%")
        if tx_type:
            query += " AND t.type = ?"
            params.append(tx_type)
        if account_id:
            query += " AND (t.account_id = ? OR t.destination_account_id = ?)"
            params.extend([account_id, account_id])

        query += " ORDER BY t.date DESC, t.id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def create_transaction(cls, tx_type: str, account_id: int, amount: int, description: str,
                           date_str: str, time_str: str = "", category_id: Optional[int] = None,
                           destination_account_id: Optional[int] = None, tags: str = "") -> Dict[str, Any]:
        amount = int(amount)
        if amount <= 0:
            raise ValueError("Nominal transaksi harus lebih besar dari 0.")

        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        # Insert Transaction
        cursor.execute("""
            INSERT INTO fin_transactions (type, account_id, destination_account_id, category_id,
                                          amount, description, date, time, tags, is_cleared, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (tx_type, account_id, destination_account_id, category_id, amount, description, date_str, time_str, tags, now))
        tx_id = cursor.lastrowid

        # Update Account Balances atomically
        if tx_type == "income":
            cursor.execute("UPDATE fin_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", (amount, now, account_id))
        elif tx_type == "expense":
            cursor.execute("UPDATE fin_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", (amount, now, account_id))
        elif tx_type == "transfer":
            if not destination_account_id or destination_account_id == account_id:
                conn.rollback()
                conn.close()
                raise ValueError("Transfer memerlukan rekening tujuan yang berbeda.")
            # Subtract from source, add to destination (balance-neutral globally)
            cursor.execute("UPDATE fin_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", (amount, now, account_id))
            cursor.execute("UPDATE fin_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", (amount, now, destination_account_id))

        conn.commit()
        FinSnapshotService.mark_snapshots_stale()

        # Fetch newly created transaction with joins
        cursor.execute("""
            SELECT t.*, 
                   a.name AS account_name,
                   da.name AS destination_account_name,
                   c.name AS category_name,
                   c.icon AS category_icon
            FROM fin_transactions t
            LEFT JOIN fin_accounts a ON t.account_id = a.id
            LEFT JOIN fin_accounts da ON t.destination_account_id = da.id
            LEFT JOIN fin_categories c ON t.category_id = c.id
            WHERE t.id = ?
        """, (tx_id,))
        created = dict(cursor.fetchone())
        conn.close()
        return created

    @classmethod
    def delete_transaction(cls, tx_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fin_transactions WHERE id = ?", (tx_id,))
        tx = cursor.fetchone()
        if not tx:
            conn.close()
            return False

        tx = dict(tx)
        amount = tx["amount"]
        now = datetime.now().isoformat()

        # Revert balances
        if tx["type"] == "income":
            cursor.execute("UPDATE fin_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", (amount, now, tx["account_id"]))
        elif tx["type"] == "expense":
            cursor.execute("UPDATE fin_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", (amount, now, tx["account_id"]))
        elif tx["type"] == "transfer":
            cursor.execute("UPDATE fin_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?", (amount, now, tx["account_id"]))
            cursor.execute("UPDATE fin_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", (amount, now, tx["destination_account_id"]))

        cursor.execute("DELETE FROM fin_transactions WHERE id = ?", (tx_id,))
        conn.commit()
        conn.close()
        FinSnapshotService.mark_snapshots_stale()
        return True

    # =========================================================================
    # BUDGETS
    # =========================================================================

    @classmethod
    def list_budgets(cls, period: Optional[str] = None) -> List[Dict[str, Any]]:
        if not period:
            period = cls.get_current_period()

        conn = get_connection()
        cursor = conn.cursor()

        # Get all budgets for the period
        cursor.execute("""
            SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
            FROM fin_budgets b
            JOIN fin_categories c ON b.category_id = c.id
            WHERE b.period = ?
            ORDER BY c.sort_order ASC, c.name ASC
        """, (period,))
        budgets = [dict(r) for r in cursor.fetchall()]

        # Compute spent amount for each budgeted category in this period
        result = []
        for b in budgets:
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
                WHERE category_id = ? AND type = 'expense' AND date LIKE ?
            """, (b["category_id"], f"{period}%"))
            spent = int(cursor.fetchone()[0])
            limit_val = int(b["limit_amount"])
            util_pct = round((spent / limit_val * 100)) if limit_val > 0 else 0
            rem = limit_val - spent

            result.append({
                "id": b["id"],
                "category_id": b["category_id"],
                "category_name": b["category_name"],
                "category_icon": b["category_icon"],
                "category_color": b["category_color"],
                "period": b["period"],
                "limit_amount": limit_val,
                "spent_amount": spent,
                "utilization_pct": util_pct,
                "remaining_amount": rem,
                "is_over_budget": spent > limit_val
            })

        conn.close()
        return result

    @classmethod
    def set_budget(cls, category_id: int, period: str, limit_amount: int) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("SELECT id FROM fin_budgets WHERE category_id = ? AND period = ?", (category_id, period))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE fin_budgets SET limit_amount = ? WHERE id = ?", (int(limit_amount), existing[0]))
            b_id = existing[0]
        else:
            cursor.execute("""
                INSERT INTO fin_budgets (category_id, period, limit_amount, created_at)
                VALUES (?, ?, ?, ?)
            """, (category_id, period, int(limit_amount), now))
            b_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": b_id, "category_id": category_id, "period": period, "limit_amount": int(limit_amount)}

    # =========================================================================
    # REMINDERS / BILLS
    # =========================================================================

    @classmethod
    def list_reminders(cls) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*, c.name AS category_name
            FROM fin_reminders r
            LEFT JOIN fin_categories c ON r.category_id = c.id
            ORDER BY r.is_paid ASC, r.due_date ASC
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()

        today = date.today()
        result = []
        for r in rows:
            try:
                due = datetime.strptime(r["due_date"], "%Y-%m-%d").date()
                days = (due - today).days
                is_overdue = days < 0 and r["is_paid"] == 0
            except Exception:
                days = 0
                is_overdue = False

            r["days_until_due"] = days
            r["is_overdue"] = is_overdue
            result.append(r)

        return result

    @classmethod
    def create_reminder(cls, title: str, amount: int, due_date: str, frequency: str = "monthly",
                        category_id: Optional[int] = None, account_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO fin_reminders (title, amount, due_date, frequency, is_paid, category_id, account_id, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?, ?)
        """, (title, int(amount), due_date, frequency, category_id, account_id, now))
        rem_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": rem_id, "status": "created"}

    @classmethod
    def pay_reminder(cls, reminder_id: int, account_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fin_reminders WHERE id = ?", (reminder_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Tagihan tidak ditemukan.")

        rem = dict(row)
        target_account = account_id or rem.get("account_id")
        if not target_account:
            # Pick first active account
            cursor.execute("SELECT id FROM fin_accounts WHERE is_active = 1 LIMIT 1")
            first_acc = cursor.fetchone()
            if not first_acc:
                conn.close()
                raise ValueError("Tidak ada akun pembayaran aktif.")
            target_account = first_acc[0]

        # Mark reminder as paid
        cursor.execute("UPDATE fin_reminders SET is_paid = 1 WHERE id = ?", (reminder_id,))
        conn.commit()
        conn.close()

        # Create corresponding expense transaction
        today_str = datetime.now().strftime("%Y-%m-%d")
        time_str = datetime.now().strftime("%H:%M")
        tx = cls.create_transaction(
            tx_type="expense",
            account_id=target_account,
            amount=rem["amount"],
            description=f"Pembayaran tagihan: {rem['title']}",
            date_str=today_str,
            time_str=time_str,
            category_id=rem.get("category_id"),
            tags="tagihan,reminder"
        )
        return {"status": "paid", "transaction": tx}

    # =========================================================================
    # SAVINGS GOALS
    # =========================================================================

    @classmethod
    def list_goals(cls) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fin_goals ORDER BY is_completed ASC, target_date ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()

        result = []
        for g in rows:
            tgt = int(g["target_amount"])
            cur = int(g["current_amount"])
            pct = round((cur / tgt * 100)) if tgt > 0 else 0
            g["progress_pct"] = min(100, pct)
            result.append(g)
        return result

    @classmethod
    def create_goal(cls, title: str, target_amount: int, target_date: str, current_amount: int = 0, icon: str = "🎯") -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO fin_goals (title, target_amount, current_amount, target_date, is_completed, icon, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        """, (title, int(target_amount), int(current_amount), target_date, icon, now))
        gid = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": gid, "status": "created"}

    @classmethod
    def deposit_goal(cls, goal_id: int, amount: int, source_account_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fin_goals WHERE id = ?", (goal_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Target tidak ditemukan.")

        goal = dict(row)
        new_curr = int(goal["current_amount"]) + int(amount)
        tgt = int(goal["target_amount"])
        is_comp = 1 if new_curr >= tgt else 0

        cursor.execute("UPDATE fin_goals SET current_amount = ?, is_completed = ? WHERE id = ?", (new_curr, is_comp, goal_id))
        conn.commit()
        conn.close()

        # If source account provided, deduct as savings allocation transaction
        if source_account_id:
            cls.create_transaction(
                tx_type="expense",
                account_id=source_account_id,
                amount=int(amount),
                description=f"Alokasi tabungan: {goal['title']}",
                date_str=cls.get_current_date(),
                time_str=datetime.now().strftime("%H:%M"),
                tags="tabungan,goal"
            )

        return {"goal_id": goal_id, "current_amount": new_curr, "is_completed": is_comp}

    # =========================================================================
    # EXECUTIVE BRIEF (FOR OFFICE VIEW - ZERO RUPIAH STRICTLY)
    # =========================================================================

    @classmethod
    def get_executive_brief(cls) -> Dict[str, Any]:
        """Calculates executive percentages and insights with ZERO rupiah amounts.
        Strictly compliant with Office privacy requirements.
        """
        period = cls.get_current_period()
        today = date.today()
        current_day = today.day

        conn = get_connection()
        cursor = conn.cursor()

        # Check total transactions count
        cursor.execute("SELECT COUNT(*) FROM fin_transactions")
        total_tx_all_time = cursor.fetchone()[0]

        has_data = total_tx_all_time > 0

        # 1. Budget Utilization
        cursor.execute("SELECT COALESCE(SUM(limit_amount), 0) FROM fin_budgets WHERE period = ?", (period,))
        total_budget_limit = int(cursor.fetchone()[0])

        cursor.execute("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM fin_transactions t
            WHERE t.type = 'expense' AND t.date LIKE ?
              AND t.category_id IN (SELECT category_id FROM fin_budgets WHERE period = ?)
        """, (f"{period}%", period))
        budgeted_spent = int(cursor.fetchone()[0])

        if total_budget_limit == 0:
            budget_widget = {
                "id": "budget_utilization",
                "title": "Budget Bulanan",
                "percentage": None,
                "status_text": "Belum Ada Batas",
                "status_tone": "neutral",
                "indicator_note": "Belum ada batas anggaran aktif bulan ini"
            }
        else:
            budget_pct = round((budgeted_spent / total_budget_limit) * 100)
            if budget_pct <= 70:
                tone = "good"
                status_txt = f"{budget_pct}% Terpakai"
                note = f"{100 - budget_pct}% ruang anggaran tersisa"
            elif budget_pct <= 95:
                tone = "warning"
                status_txt = f"{budget_pct}% Waspada"
                note = f"Mendekati batas ({100 - budget_pct}% sisa)"
            elif budget_pct <= 100:
                tone = "warning"
                status_txt = f"{budget_pct}% Kritis"
                note = "Batas anggaran hampir habis"
            else:
                tone = "danger"
                status_txt = f"{budget_pct}% Over Budget"
                note = f"Melampaui batas sebesar {budget_pct - 100}%"

            budget_widget = {
                "id": "budget_utilization",
                "title": "Budget Bulanan",
                "percentage": budget_pct,
                "status_text": status_txt,
                "status_tone": tone,
                "indicator_note": note
            }

        # 2. Recording Coverage (Days recorded in current month)
        cursor.execute("""
            SELECT COUNT(DISTINCT date) FROM fin_transactions
            WHERE date LIKE ?
        """, (f"{period}%",))
        recorded_days = int(cursor.fetchone()[0])

        coverage_pct = round((recorded_days / current_day) * 100) if current_day > 0 else 0
        coverage_pct = min(100, coverage_pct)

        if coverage_pct >= 75:
            c_tone = "good"
            c_status = f"{coverage_pct}% Disiplin"
            c_note = f"{recorded_days} dari {current_day} hari tercatat aktif"
        elif coverage_pct >= 40:
            c_tone = "warning"
            c_status = f"{coverage_pct}% Berkala"
            c_note = f"{recorded_days} dari {current_day} hari tercatat"
        else:
            c_tone = "neutral"
            c_status = f"{coverage_pct}% Awal Bulan" if current_day <= 5 else f"{coverage_pct}% Perlu Dicatat"
            c_note = f"Baru {recorded_days} hari terdata bulan ini"

        recording_widget = {
            "id": "recording_coverage",
            "title": "Konsistensi Catat",
            "percentage": coverage_pct,
            "status_text": c_status,
            "status_tone": c_tone,
            "indicator_note": c_note
        }

        # 3. Savings Allocation
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'income' AND date LIKE ?
        """, (f"{period}%",))
        total_income = int(cursor.fetchone()[0])

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'expense' AND date LIKE ?
        """, (f"{period}%",))
        total_expense = int(cursor.fetchone()[0])

        if total_income == 0:
            savings_widget = {
                "id": "savings_allocation",
                "title": "Rasio Tabungan",
                "percentage": None,
                "status_text": "Nihil",
                "status_tone": "neutral",
                "indicator_note": "Belum ada catatan pemasukan bulan ini"
            }
        else:
            net_saved = total_income - total_expense
            if net_saved <= 0:
                s_pct = 0
                s_tone = "danger"
                s_status = "0% (Defisit)"
                s_note = "Pengeluaran melampaui pemasukan bulan ini"
            else:
                s_pct = round((net_saved / total_income) * 100)
                if s_pct >= 25:
                    s_tone = "good"
                    s_status = f"{s_pct}% Sehat"
                    s_note = "Alokasi tabungan di atas standar 20%"
                elif s_pct >= 10:
                    s_tone = "warning"
                    s_status = f"{s_pct}% Cukup"
                    s_note = "Arus kas positif, terus tingkatkan"
                else:
                    s_tone = "danger"
                    s_status = f"{s_pct}% Tipis"
                    s_note = "Margin tabungan di bawah 10%"

            savings_widget = {
                "id": "savings_allocation",
                "title": "Rasio Tabungan",
                "percentage": s_pct,
                "status_text": s_status,
                "status_tone": s_tone,
                "indicator_note": s_note
            }

        # 4. Upcoming Obligations
        cursor.execute("""
            SELECT COUNT(*), COALESCE(SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END), 0)
            FROM fin_reminders
            WHERE due_date LIKE ? OR is_paid = 0
        """, (f"{period}%",))
        rem_row = cursor.fetchone()
        total_rem = int(rem_row[0]) if rem_row else 0
        paid_rem = int(rem_row[1]) if rem_row else 0

        # Count overdue
        cursor.execute("""
            SELECT COUNT(*) FROM fin_reminders
            WHERE is_paid = 0 AND due_date < ?
        """, (cls.get_current_date(),))
        overdue_count = int(cursor.fetchone()[0])

        if total_rem == 0:
            obligations_widget = {
                "id": "upcoming_obligations",
                "title": "Kewajiban Tagihan",
                "percentage": 100,
                "status_text": "100% Bersih",
                "status_tone": "good",
                "indicator_note": "Tidak ada tagihan tertunda bulan ini"
            }
        else:
            ob_pct = round((paid_rem / total_rem) * 100)
            if overdue_count > 0:
                ob_tone = "danger"
                ob_status = f"{overdue_count} Terlambat"
                ob_note = f"{paid_rem} dari {total_rem} tagihan terselesaikan"
            elif ob_pct == 100:
                ob_tone = "good"
                ob_status = "100% Lunas"
                ob_note = "Semua kewajiban bulan ini sudah selesai"
            else:
                ob_tone = "warning"
                unpaid = total_rem - paid_rem
                ob_status = f"{unpaid} Menanti"
                ob_note = f"{ob_pct}% tagihan telah terselesaikan"

            obligations_widget = {
                "id": "upcoming_obligations",
                "title": "Kewajiban Tagihan",
                "percentage": ob_pct,
                "status_text": ob_status,
                "status_tone": ob_tone,
                "indicator_note": ob_note
            }

        # Generate Deterministic Bullet Insights
        insights = []
        if not has_data:
            insights.append("Fin siap mendampingi. Mulai catat transaksi pertama Anda atau hubungkan akun.")
            insights.append("Atur batas budget bulanan agar persentase utilitas dapat dipantau.")
            insights.append("Jadwalkan pengingat tagihan rutin untuk menjaga skor ketepatan kewajiban.")
        else:
            if total_budget_limit > 0:
                insights.append(f"Utilisasi anggaran bulan ini berjalan di {budget_widget['percentage']}%.")
            else:
                insights.append("Belum ada batas budget kategori. Disarankan menyetel budget untuk pos utama.")

            if recording_widget["percentage"] >= 60:
                insights.append(f"Pencatatan konsisten ({recording_widget['percentage']}% hari aktif). Data keuangan sangat akurat.")
            else:
                insights.append("Disiplin pencatatan harian dapat ditingkatkan untuk visibilitas arus kas yang lebih baik.")

            if overdue_count > 0:
                insights.append(f"Perhatian: Ada {overdue_count} tagihan yang melewati tanggal jatuh tempo.")
            elif total_rem > 0 and paid_rem < total_rem:
                insights.append(f"Ada {total_rem - paid_rem} tagihan mendatang yang menanti penyelesaian.")

        conn.close()

        return {
            "has_data": has_data,
            "budget_utilization": budget_widget,
            "recording_coverage": recording_widget,
            "savings_allocation": savings_widget,
            "upcoming_obligations": obligations_widget,
            "insights": insights,
            "quick_tips": "Klik Fin untuk membuka ruang kerja detail dengan kontrol privasi nominal.",
            "fin_status": "active" if has_data else "ready"
        }

    # =========================================================================
    # FINANCIAL SUMMARY (FOR FIN WORKSPACE VIEW - WITH PRIVACY NOMINALS)
    # =========================================================================

    @classmethod
    def get_financial_summary(cls, period: Optional[str] = None) -> Dict[str, Any]:
        if not period:
            period = cls.get_current_period()

        conn = get_connection()
        cursor = conn.cursor()

        # Total Net Worth across active accounts
        cursor.execute("SELECT COALESCE(SUM(balance), 0), COUNT(*) FROM fin_accounts WHERE is_active = 1")
        row = cursor.fetchone()
        net_worth = int(row[0]) if row else 0
        accounts_count = int(row[1]) if row else 0

        # Income this period
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'income' AND date LIKE ?
        """, (f"{period}%",))
        total_income = int(cursor.fetchone()[0])

        # Expense this period
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'expense' AND date LIKE ?
        """, (f"{period}%",))
        total_expense = int(cursor.fetchone()[0])

        net_savings = total_income - total_expense
        savings_rate = round((net_savings / total_income * 100)) if total_income > 0 and net_savings > 0 else 0

        # Budgets
        cursor.execute("SELECT COALESCE(SUM(limit_amount), 0) FROM fin_budgets WHERE period = ?", (period,))
        total_budget_limit = int(cursor.fetchone()[0])

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'expense' AND date LIKE ?
              AND category_id IN (SELECT category_id FROM fin_budgets WHERE period = ?)
        """, (f"{period}%", period))
        total_budget_spent = int(cursor.fetchone()[0])
        overall_util = round((total_budget_spent / total_budget_limit * 100)) if total_budget_limit > 0 else 0

        # Total transactions in period
        cursor.execute("SELECT COUNT(*) FROM fin_transactions WHERE date LIKE ?", (f"{period}%",))
        tx_count = int(cursor.fetchone()[0])

        # Unpaid reminders
        cursor.execute("SELECT COUNT(*) FROM fin_reminders WHERE is_paid = 0")
        unpaid_rem = int(cursor.fetchone()[0])

        # Category breakdown for expenses
        cursor.execute("""
            SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) AS total_amount
            FROM fin_transactions t
            JOIN fin_categories c ON t.category_id = c.id
            WHERE t.type = 'expense' AND t.date LIKE ?
            GROUP BY c.id
            ORDER BY total_amount DESC
        """, (f"{period}%",))
        breakdown_rows = cursor.fetchall()
        category_breakdown = []
        for r in breakdown_rows:
            amt = int(r["total_amount"])
            pct = round((amt / total_expense * 100)) if total_expense > 0 else 0
            category_breakdown.append({
                "category_id": r["id"],
                "name": r["name"],
                "icon": r["icon"],
                "color": r["color"],
                "amount": amt,
                "percentage": pct
            })

        conn.close()

        return {
            "current_period": period,
            "total_net_worth": net_worth,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": net_savings,
            "savings_rate_pct": savings_rate,
            "total_budget_limit": total_budget_limit,
            "total_budget_spent": total_budget_spent,
            "overall_budget_utilization_pct": overall_util,
            "accounts_count": accounts_count,
            "transactions_count": tx_count,
            "unpaid_reminders_count": unpaid_rem,
            "category_breakdown": category_breakdown
        }

    # =========================================================================
    # TANYA FIN (DETERMINISTIC CONVERSATIONAL ASSISTANT - ZERO LLM REQUIRED)
    # =========================================================================

    @classmethod
    def ask_fin(cls, question: str) -> Dict[str, Any]:
        """Provides instant deterministic financial answers based on real user figures."""
        q = question.lower().strip()
        period = cls.get_current_period()
        summary = cls.get_financial_summary(period)

        def format_rupiah(num: int) -> str:
            return f"Rp {num:,}".replace(",", ".")

        # Intent: Expense / Pengeluaran
        if any(w in q for w in ["pengeluaran", "keluar", "belanja", "boros"]):
            exp = summary["total_expense"]
            top_cat = summary["category_breakdown"][0] if summary["category_breakdown"] else None
            if exp == 0:
                ans = f"Bulan ini ({period}) belum ada catatan pengeluaran. Semua alokasi masih aman!"
            else:
                ans = f"Total pengeluaran Anda bulan ini tercatat sebesar {format_rupiah(exp)}."
                if top_cat:
                    ans += f" Pos terbesar berada di '{top_cat['name']}' ({format_rupiah(top_cat['amount'])}, {top_cat['percentage']}%)."
            return {
                "answer": ans,
                "intent": "expense",
                "suggestions": ["Berapa pemasukan bulan ini?", "Bagaimana status budget?", "Ada tagihan apa?"]
            }

        # Intent: Income / Pemasukan
        if any(w in q for w in ["pemasukan", "masuk", "gaji", "income"]):
            inc = summary["total_income"]
            if inc == 0:
                ans = f"Belum ada catatan pemasukan untuk bulan {period}. Jangan lupa mencatat gaji atau omzet ya!"
            else:
                ans = f"Total pemasukan tercatat bulan ini sebesar {format_rupiah(inc)}. Sisa bersih kas (net savings): {format_rupiah(summary['net_savings'])}."
            return {
                "answer": ans,
                "intent": "income",
                "suggestions": ["Berapa rasio tabungan?", "Lihat transaksi terakhir"]
            }

        # Intent: Budget / Anggaran
        if any(w in q for w in ["budget", "anggaran", "limit"]):
            b_list = cls.list_budgets(period)
            if not b_list:
                ans = f"Anda belum menyetel batas budget untuk bulan {period}. Buka tab Budget di Fin Workspace untuk memasang batas per kategori!"
            else:
                over = [b for b in b_list if b["is_over_budget"]]
                ans = f"Utilisasi keseluruhan budget Anda berada di {summary['overall_budget_utilization_pct']}%."
                if over:
                    names = ", ".join([o["category_name"] for o in over])
                    ans += f" ⚠️ Perhatian: Kategori {names} sudah melampaui batas!"
                else:
                    ans += " Semua kategori masih berada di dalam batas yang ditentukan."
            return {
                "answer": ans,
                "intent": "budget",
                "suggestions": ["Kategori apa paling boros?", "Catat pengeluaran baru"]
            }

        # Intent: Reminders / Tagihan
        if any(w in q for w in ["tagihan", "reminder", "bayar", "jatuh tempo", "listrik"]):
            reminders = cls.list_reminders()
            unpaid = [r for r in reminders if r["is_paid"] == 0]
            if not unpaid:
                ans = "Kabar baik! Semua tagihan Anda saat ini sudah lunas atau belum ada jadwal tagihan baru."
            else:
                overdue = [r for r in unpaid if r["is_overdue"]]
                ans = f"Ada {len(unpaid)} tagihan yang menanti pembayaran."
                if overdue:
                    ans += f" ⚠️ {len(overdue)} tagihan sudah melewati jatuh tempo: {overdue[0]['title']} ({format_rupiah(overdue[0]['amount'])})."
                else:
                    ans += f" Tagihan terdekat: {unpaid[0]['title']} ({format_rupiah(unpaid[0]['amount'])}) jatuh tempo {unpaid[0]['due_date']}."
            return {
                "answer": ans,
                "intent": "reminder",
                "suggestions": ["Bayar tagihan sekarang", "Berapa saldo di dompet?"]
            }

        # Intent: Saldo / Net Worth / Rekening
        if any(w in q for w in ["saldo", "uang", "kas", "rekening", "net worth", "total"]):
            nw = summary["total_net_worth"]
            accounts = cls.list_accounts()
            ans = f"Total saldo bersih di seluruh akun Anda adalah {format_rupiah(nw)} yang tersebar di {len(accounts)} akun aktif."
            return {
                "answer": ans,
                "intent": "balance",
                "suggestions": ["Rincian per akun", "Berapa sisa tabungan bulan ini?"]
            }

        # Intent: Rekomendasi / Saran Finansial
        if any(w in q for w in ["saran", "rekomendasi", "tips", "bantu"]):
            s_rate = summary["savings_rate_pct"]
            if s_rate >= 20:
                ans = f"Performa keuangan Anda sangat solid dengan rasio tabungan {s_rate}%. Pertahankan disiplin ini dan alokasikan sebagian ke target dana darurat!"
            elif s_rate > 0:
                ans = f"Rasio tabungan Anda saat ini {s_rate}%. Cobalah mengevaluasi kategori pengeluaran terbesar agar bisa mendekati target ideal 20%."
            else:
                ans = "Saat ini pengeluaran sebanding atau melebihi pemasukan bulan ini. Disarankan membatasi pos tersier dan mengunci budget harian."
            return {
                "answer": ans,
                "intent": "advice",
                "suggestions": ["Cek status budget", "Berapa pengeluaran bulan ini?"]
            }

        # Default fallback
        ans = ("Halo! Saya Fin, spesialis keuangan pribadi Anda. Saya bisa membantu Anda memantau pengeluaran, "
               "mengecek batas budget, mengingatkan tagihan jatuh tempo, atau menganalisis rasio tabungan.")
        return {
            "answer": ans,
            "intent": "general",
            "suggestions": ["Berapa pengeluaran bulan ini?", "Bagaimana status budget?", "Ada tagihan apa minggu ini?", "Berapa total saldo?"]
        }

    # =========================================================================
    # EXPORT CSV
    # =========================================================================

    @classmethod
    def export_csv(cls, period: Optional[str] = None) -> str:
        txs = cls.list_transactions(period=period, limit=1000)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Tanggal", "Jam", "Tipe", "Akun", "Tujuan Transfer", "Kategori", "Deskripsi", "Jumlah (IDR)", "Tags"])
        for t in txs:
            writer.writerow([
                t["id"],
                t["date"],
                t["time"] or "",
                t["type"],
                t["account_name"] or "",
                t["destination_account_name"] or "",
                t["category_name"] or "",
                t["description"],
                t["amount"],
                t["tags"] or ""
            ])
        return output.getvalue()

    # =========================================================================
    # TRANSFERS
    # =========================================================================

    @classmethod
    def list_transfers(cls, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT tr.id,
                   tr.from_account_id AS source_account_id,
                   tr.to_account_id AS destination_account_id,
                   tr.amount,
                   tr.admin_fee AS fee,
                   tr.notes,
                   tr.date,
                   tr.created_at,
                   sa.name as source_account_name,
                   sa.bank_name as source_bank_name,
                   da.name as destination_account_name,
                   da.bank_name as destination_bank_name
            FROM fin_transfers tr
            JOIN fin_accounts sa ON tr.from_account_id = sa.id
            JOIN fin_accounts da ON tr.to_account_id = da.id
            ORDER BY tr.date DESC, tr.id DESC
            LIMIT ?
        """, (limit,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def create_transfer(cls, source_account_id: int, destination_account_id: int,
                        amount: int, fee: int = 0, notes: str = "", date_str: Optional[str] = None) -> Dict[str, Any]:
        amount = int(amount)
        fee = int(fee or 0)
        if amount <= 0:
            raise ValueError("Nominal transfer harus lebih besar dari 0.")
        if source_account_id == destination_account_id:
            raise ValueError("Rekening sumber dan tujuan tidak boleh sama.")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Verify source account has enough balance
        cursor.execute("SELECT balance, name FROM fin_accounts WHERE id = ?", (source_account_id,))
        src = cursor.fetchone()
        if not src:
            conn.close()
            raise ValueError("Rekening sumber tidak ditemukan.")
        if src["balance"] < (amount + fee):
            conn.close()
            raise ValueError(f"Saldo {src['name']} tidak mencukupi (Saldo: Rp {src['balance']:,}, Butuh: Rp {(amount+fee):,}).")

        # Verify destination exists
        cursor.execute("SELECT id, name FROM fin_accounts WHERE id = ?", (destination_account_id,))
        dest = cursor.fetchone()
        if not dest:
            conn.close()
            raise ValueError("Rekening tujuan tidak ditemukan.")

        now = datetime.now().isoformat()
        if not date_str:
            date_str = cls.get_current_date()

        # Insert into fin_transfers
        cursor.execute("""
            INSERT INTO fin_transfers (from_account_id, to_account_id, amount, admin_fee, notes, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (source_account_id, destination_account_id, amount, fee, notes, date_str, now))
        transfer_id = cursor.lastrowid

        # Update source account (deduct amount + fee)
        total_deduct = amount + fee
        cursor.execute("UPDATE fin_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?",
                       (total_deduct, now, source_account_id))
        
        # Update destination account (add amount)
        cursor.execute("UPDATE fin_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?",
                       (amount, now, destination_account_id))

        # Also record in fin_transactions as a transfer for audit history
        cursor.execute("""
            INSERT INTO fin_transactions (type, account_id, destination_account_id, amount, description, date, is_cleared, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        """, ("transfer", source_account_id, destination_account_id, amount, f"Transfer: {notes or 'Antar-rekening'}", date_str, now))

        # If fee > 0, record fee as expense
        if fee > 0:
            cursor.execute("""
                INSERT INTO fin_transactions (type, account_id, amount, description, date, is_cleared, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            """, ("expense", source_account_id, fee, f"Biaya transfer ke {dest['name']}", date_str, now))

        conn.commit()
        FinSnapshotService.mark_snapshots_stale()

        cursor.execute("""
            SELECT tr.id,
                   tr.from_account_id AS source_account_id,
                   tr.to_account_id AS destination_account_id,
                   tr.amount,
                   tr.admin_fee AS fee,
                   tr.notes,
                   tr.date,
                   tr.created_at,
                   sa.name as source_account_name,
                   sa.bank_name as source_bank_name,
                   da.name as destination_account_name,
                   da.bank_name as destination_bank_name
            FROM fin_transfers tr
            JOIN fin_accounts sa ON tr.from_account_id = sa.id
            JOIN fin_accounts da ON tr.to_account_id = da.id
            WHERE tr.id = ?
        """, (transfer_id,))
        created = dict(cursor.fetchone())
        conn.close()
        return created

    # =========================================================================
    # DANA CADANGAN / RESERVES
    # =========================================================================

    @classmethod
    def list_reserves(cls) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*, a.name as account_name, a.bank_name
            FROM fin_reserves r
            LEFT JOIN fin_accounts a ON r.account_id = a.id
            ORDER BY r.is_completed ASC, r.id DESC
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def create_reserve(cls, name: str, target_amount: int, allocated_amount: int = 0,
                       account_id: Optional[int] = None, category: Optional[str] = "Dana Darurat",
                       notes: str = "", target_date: Optional[str] = None) -> Dict[str, Any]:
        now = datetime.now().isoformat()
        target_amount = int(target_amount)
        allocated_amount = int(allocated_amount or 0)
        is_completed = 1 if allocated_amount >= target_amount and target_amount > 0 else 0

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO fin_reserves (name, target_amount, allocated_amount, account_id, category, notes, target_date, is_completed, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, target_amount, allocated_amount, account_id, category, notes, target_date, is_completed, now, now))
        reserve_id = cursor.lastrowid
        conn.commit()

        cursor.execute("""
            SELECT r.*, a.name as account_name, a.bank_name
            FROM fin_reserves r
            LEFT JOIN fin_accounts a ON r.account_id = a.id
            WHERE r.id = ?
        """, (reserve_id,))
        res = dict(cursor.fetchone())
        conn.close()
        return res

    @classmethod
    def update_reserve(cls, reserve_id: int, allocated_amount: Optional[int] = None,
                       target_amount: Optional[int] = None, is_completed: Optional[bool] = None,
                       notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fin_reserves WHERE id = ?", (reserve_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return None

        existing = dict(existing)
        now = datetime.now().isoformat()

        new_alloc = int(allocated_amount) if allocated_amount is not None else existing["allocated_amount"]
        new_target = int(target_amount) if target_amount is not None else existing["target_amount"]
        if is_completed is not None:
            comp = 1 if is_completed else 0
        else:
            comp = 1 if new_alloc >= new_target and new_target > 0 else 0
        new_notes = notes if notes is not None else existing["notes"]

        cursor.execute("""
            UPDATE fin_reserves
            SET allocated_amount = ?, target_amount = ?, is_completed = ?, notes = ?, updated_at = ?
            WHERE id = ?
        """, (new_alloc, new_target, comp, new_notes, now, reserve_id))
        conn.commit()

        cursor.execute("""
            SELECT r.*, a.name as account_name, a.bank_name
            FROM fin_reserves r
            LEFT JOIN fin_accounts a ON r.account_id = a.id
            WHERE r.id = ?
        """, (reserve_id,))
        res = dict(cursor.fetchone())
        conn.close()
        return res

    @classmethod
    def delete_reserve(cls, reserve_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM fin_reserves WHERE id = ?", (reserve_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
