"""Fin Agent Structured Financial Snapshot Service.

Produces deterministic, pure-integer IDR financial snapshots conforming to the
'fin.snapshot.v1' contract for consumption by Welly and executive auditing.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from backend.database import get_connection


class FinSnapshotService:

    @classmethod
    def generate_snapshot(cls, period: Optional[str] = None, user_id: int = 1) -> Dict[str, Any]:
        """Generates a complete, structured financial snapshot for a given period."""
        if not period:
            period = datetime.now().strftime("%Y-%m")

        conn = get_connection()
        cursor = conn.cursor()

        # 1. Facts - Actual Cashflows & Balances (excluding transfers)
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'income' AND date LIKE ?
        """, (f"{period}%",))
        actual_income = int(cursor.fetchone()[0])

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM fin_transactions
            WHERE type = 'expense' AND date LIKE ?
        """, (f"{period}%",))
        actual_expense = int(cursor.fetchone()[0])

        net_cashflow = actual_income - actual_expense

        # Expense by Category
        cursor.execute("""
            SELECT c.id, c.name, c.icon, COALESCE(SUM(t.amount), 0) AS total_spent
            FROM fin_categories c
            LEFT JOIN fin_transactions t ON c.id = t.category_id AND t.type = 'expense' AND t.date LIKE ?
            WHERE c.type = 'expense'
            GROUP BY c.id, c.name, c.icon
            HAVING total_spent > 0
            ORDER BY total_spent DESC
        """, (f"{period}%",))
        category_expenses = [
            {"category_id": r["id"], "name": r["name"], "icon": r["icon"], "amount": int(r["total_spent"])}
            for r in cursor.fetchall()
        ]

        # Liquid Balance across all active accounts
        cursor.execute("SELECT COALESCE(SUM(balance), 0) FROM fin_accounts WHERE is_active = 1")
        liquid_balance = int(cursor.fetchone()[0])

        # Latest ledger transaction update time
        cursor.execute("SELECT MAX(created_at) FROM fin_transactions WHERE date LIKE ?", (f"{period}%",))
        latest_tx_time = cursor.fetchone()[0] or datetime.now().isoformat()

        # 2. Plans and Commitments
        cursor.execute("""
            SELECT b.category_id, c.name, c.icon, b.limit_amount,
                   COALESCE((
                       SELECT SUM(amount) FROM fin_transactions
                       WHERE category_id = b.category_id AND type = 'expense' AND date LIKE ?
                   ), 0) AS spent_amount
            FROM fin_budgets b
            JOIN fin_categories c ON b.category_id = c.id
            WHERE b.period = ?
        """, (f"{period}%", period))
        budget_rows = cursor.fetchall()

        total_budget_limit = sum(int(r["limit_amount"]) for r in budget_rows)
        budget_realization = []
        for r in budget_rows:
            limit_val = int(r["limit_amount"])
            spent_val = int(r["spent_amount"])
            pct = round((spent_val / limit_val * 100), 1) if limit_val > 0 else 0.0
            budget_realization.append({
                "category_id": r["category_id"],
                "name": r["name"],
                "icon": r["icon"],
                "limit_amount": limit_val,
                "spent_amount": spent_val,
                "remaining_amount": limit_val - spent_val,
                "percentage_used": pct
            })

        # Known upcoming bills (unpaid reminders)
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM fin_reminders WHERE is_paid = 0")
        known_upcoming_bills = int(cursor.fetchone()[0])

        # Reserved savings goals (earmarked funds that must not be counted as unallocated)
        cursor.execute("SELECT COALESCE(SUM(current_amount), 0) FROM fin_goals WHERE is_completed = 0")
        reserved_savings_goals = int(cursor.fetchone()[0])

        # 3. Unallocated Surplus Capacity
        # Formula: Liquid Balance - Reserved Savings Goals - Upcoming Bills
        unallocated_liquid_surplus = max(0, liquid_balance - reserved_savings_goals - known_upcoming_bills)
        monthly_free_cashflow_potential = max(0, actual_income - actual_expense - known_upcoming_bills)

        # 4. Data Quality & Notes
        missing_notes: List[str] = []
        if actual_income == 0:
            missing_notes.append("Pemasukan aktual periode ini belum dicatat.")
        if actual_expense == 0:
            missing_notes.append("Pengeluaran aktual periode ini belum dicatat.")
        if not budget_rows:
            missing_notes.append("Belum ada pagu budget kategori yang ditetapkan untuk periode ini.")
        if known_upcoming_bills == 0:
            missing_notes.append("Tidak ada tagihan atau kewajiban berkala yang tercatat.")

        conn.close()

        report_id = f"snap_{period}_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now().isoformat()

        snapshot = {
            "metadata": {
                "report_id": report_id,
                "schema_version": "fin.snapshot.v1",
                "user_id": user_id,
                "period": period,
                "generated_at": now_iso,
                "last_ledger_updated_at": latest_tx_time,
                "base_currency": "IDR"
            },
            "facts": {
                "actual_income": actual_income,
                "actual_expense": actual_expense,
                "net_cashflow": net_cashflow,
                "expense_by_category": category_expenses,
                "liquid_balance": liquid_balance,
                "reconciled_status": "clean" if liquid_balance >= 0 else "negative_balance_alert"
            },
            "plans_and_commitments": {
                "total_budget_limit": total_budget_limit,
                "budget_realization": budget_realization,
                "known_upcoming_bills": known_upcoming_bills,
                "reserved_savings_goals": reserved_savings_goals
            },
            "unallocated_surplus_capacity": {
                "formula": "liquid_balance - reserved_savings_goals - known_upcoming_bills",
                "unallocated_liquid_surplus": unallocated_liquid_surplus,
                "monthly_free_cashflow_potential": monthly_free_cashflow_potential
            },
            "data_quality": {
                "missing_data_notes": missing_notes,
                "is_stale": False,
                "completeness_score": 100 - (len(missing_notes) * 20)
            }
        }

        # Persist snapshot
        cls.save_snapshot(snapshot)
        return snapshot

    @classmethod
    def save_snapshot(cls, snapshot: Dict[str, Any]) -> str:
        """Saves generated snapshot to database."""
        meta = snapshot["metadata"]
        report_id = meta["report_id"]
        user_id = meta.get("user_id", 1)
        period = meta["period"]
        generated_at = meta["generated_at"]
        last_ledger_time = meta["last_ledger_updated_at"]
        snapshot_json = json.dumps(snapshot)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO fin_snapshots 
            (report_id, user_id, period, snapshot_json, generated_at, last_ledger_updated_at, is_stale)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (report_id, user_id, period, snapshot_json, generated_at, last_ledger_time))
        conn.commit()
        conn.close()
        return report_id

    @classmethod
    def get_latest_snapshot(cls, period: Optional[str] = None, user_id: int = 1) -> Optional[Dict[str, Any]]:
        """Retrieves the latest snapshot for a period or generates a fresh one if none exists."""
        if not period:
            period = datetime.now().strftime("%Y-%m")

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT report_id, snapshot_json, is_stale, generated_at
            FROM fin_snapshots
            WHERE user_id = ? AND period = ?
            ORDER BY generated_at DESC LIMIT 1
        """, (user_id, period))
        row = cursor.fetchone()
        conn.close()

        if row:
            data = json.loads(row["snapshot_json"])
            data["data_quality"]["is_stale"] = bool(row["is_stale"])
            return data

        # If none exists yet, generate and return one
        return cls.generate_snapshot(period=period, user_id=user_id)

    @classmethod
    def mark_snapshots_stale(cls, user_id: int = 1):
        """Marks snapshots as stale when ledger transactions change."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE fin_snapshots SET is_stale = 1 WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
