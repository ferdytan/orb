"""Welly Agent Service - Wealth & Long-Term Financial Planning.

Welly utilizes Fin's structured snapshot to evaluate contribution capacity,
model savings/investment horizons, and advise on wealth allocations.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.database import get_connection
from backend.agents.fin.reporting import FinSnapshotService


class WellyService:

    @classmethod
    def list_wealth_plans(cls, user_id: int = 1) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM welly_wealth_plans
            WHERE user_id = ?
            ORDER BY id ASC
        """, (user_id,))
        rows = cursor.fetchall()
        conn.close()

        plans = []
        for r in rows:
            target = int(r["target_amount"])
            curr = int(r["current_amount"])
            pct = round((curr / target * 100), 1) if target > 0 else 0.0
            p = dict(r)
            p["progress_percentage"] = pct
            plans.append(p)
        return plans

    @classmethod
    def get_wealth_plan(cls, plan_id: int, user_id: int = 1) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM welly_wealth_plans WHERE id = ? AND user_id = ?", (plan_id, user_id))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        target = int(row["target_amount"])
        curr = int(row["current_amount"])
        pct = round((curr / target * 100), 1) if target > 0 else 0.0
        p = dict(row)
        p["progress_percentage"] = pct
        return p

    @classmethod
    def create_wealth_plan(cls, user_id: int = 1, title: str = "", target_amount: int = 0,
                           current_amount: int = 0, monthly_contribution_target: int = 0,
                           risk_profile: str = "moderate", horizon_years: int = 5) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO welly_wealth_plans 
            (user_id, title, target_amount, current_amount, monthly_contribution_target, risk_profile, horizon_years, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, title, int(target_amount), int(current_amount), int(monthly_contribution_target), risk_profile, int(horizon_years), now, now))
        plan_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return cls.get_wealth_plan(plan_id, user_id=user_id)

    @classmethod
    def update_wealth_plan(cls, plan_id: int, user_id: int = 1, **kwargs) -> Optional[Dict[str, Any]]:
        plan = cls.get_wealth_plan(plan_id, user_id)
        if not plan:
            return None

        allowed = ["title", "target_amount", "current_amount", "monthly_contribution_target", "risk_profile", "horizon_years"]
        updates = []
        values = []
        for k, v in kwargs.items():
            if k in allowed and v is not None:
                updates.append(f"{k} = ?")
                values.append(v)

        if not updates:
            return plan

        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.extend([plan_id, user_id])

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE welly_wealth_plans SET {', '.join(updates)} WHERE id = ? AND user_id = ?", values)
        conn.commit()
        conn.close()
        return cls.get_wealth_plan(plan_id, user_id)

    @classmethod
    def delete_wealth_plan(cls, plan_id: int, user_id: int = 1) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM welly_wealth_plans WHERE id = ? AND user_id = ?", (plan_id, user_id))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    @classmethod
    def evaluate_contribution_capacity(cls, period: Optional[str] = None, user_id: int = 1) -> Dict[str, Any]:
        """Calculates capacity ratio and readiness based on Fin's snapshot and Welly's monthly targets."""
        if not period:
            period = datetime.now().strftime("%Y-%m")

        snapshot = FinSnapshotService.get_latest_snapshot(period=period, user_id=user_id)
        plans = cls.list_wealth_plans(user_id=user_id)
        total_monthly_target = sum(p["monthly_contribution_target"] for p in plans)

        surplus_capacity = snapshot["unallocated_surplus_capacity"]
        unalloc_surplus = surplus_capacity["unallocated_liquid_surplus"]
        monthly_potential = surplus_capacity["monthly_free_cashflow_potential"]

        ratio = 0.0
        if total_monthly_target > 0:
            ratio = round((monthly_potential / total_monthly_target) * 100, 1)

        readiness = "ready"
        recommendations = []

        if monthly_potential >= total_monthly_target and total_monthly_target > 0:
            readiness = "ready"
            recommendations.append(
                f"Kapasitas arus kas bulanan (Rp {monthly_potential:,}) mencukupi untuk memenuhi target kontribusi bulanan (Rp {total_monthly_target:,})."
            )
        elif monthly_potential > 0 and total_monthly_target > 0:
            readiness = "tight"
            deficit = total_monthly_target - monthly_potential
            recommendations.append(
                f"Kapasitas arus kas saat ini hanya menutupi {ratio}% target bulanan (defisit Rp {deficit:,}). Pertimbangkan rasionalisasi pengeluaran non-esensial di Fin."
            )
        elif total_monthly_target == 0:
            readiness = "insufficient_data"
            recommendations.append("Belum ada target kontribusi bulanan yang ditentukan pada rencana Welly.")
        else:
            readiness = "deficit"
            recommendations.append("Arus kas bebas bulan ini berada di angka nol atau defisit. Prioritaskan kestabilan dana darurat dan tagihan wajib terlebih dahulu.")

        return {
            "user_id": user_id,
            "period": period,
            "unallocated_liquid_surplus": unalloc_surplus,
            "monthly_free_cashflow_potential": monthly_potential,
            "monthly_contribution_target": total_monthly_target,
            "capacity_ratio_pct": ratio,
            "readiness_level": readiness,
            "recommendations": recommendations
        }

    @classmethod
    def ask_welly(cls, message: str, user_id: int = 1) -> Dict[str, Any]:
        """Deterministic financial advisor response with context awareness."""
        msg_lower = message.lower()
        capacity = cls.evaluate_contribution_capacity(user_id=user_id)
        plans = cls.list_wealth_plans(user_id=user_id)

        if any(w in msg_lower for w in ["kapasitas", "investasi", "mampu", "kontribusi"]):
            ratio = capacity["capacity_ratio_pct"]
            pot = capacity["monthly_free_cashflow_potential"]
            target = capacity["monthly_contribution_target"]
            text = (
                f"Berdasarkan laporan keuangan aktual dari Fin, potensi arus kas bebas Anda bulan ini adalah "
                f"Rp {pot:,}. Total target kontribusi bulanan portofolio Welly adalah Rp {target:,} "
                f"(rasio kecukupan: {ratio}%).\n\n"
                f"Tingkat kesiapan saat ini: **{capacity['readiness_level'].upper()}**."
            )
            suggestions = ["Buka Review Bersama", "Lihat Target & Alokasi", "Tanya tentang Dana Darurat"]

        elif any(w in msg_lower for w in ["target", "rencana", "portofolio", "alokasi"]):
            plan_summaries = [f"• {p['title']}: Rp {p['current_amount']:,} / Rp {p['target_amount']:,} ({p['progress_percentage']}%)" for p in plans]
            plans_text = "\n".join(plan_summaries) if plan_summaries else "Belum ada rencana yang dibuat."
            text = (
                f"Berikut adalah status target kekayaan Anda saat ini:\n\n{plans_text}\n\n"
                f"Saya siap membantu menyesuaikan skenario alokasi jika kondisi keuangan Anda berubah."
            )
            suggestions = ["Evaluasi Kapasitas Kontribusi", "Buat Target Baru", "Review Bersama Fin"]

        elif any(w in msg_lower for w in ["darurat", "emergency", "buffer"]):
            surplus = capacity["unallocated_liquid_surplus"]
            text = (
                f"Sebagai perencana kekayaan, saya menyarankan cadangan likuid minimal 3–6 bulan pengeluaran wajib. "
                f"Saldo likuid bebas yang teridentifikasi dari Fin saat ini adalah Rp {surplus:,}."
            )
            suggestions = ["Cek Tagihan di Fin", "Review Alokasi Tabungan", "Buka Workspace Fin"]

        else:
            text = (
                f"Halo! Saya Welly, perencana kekayaan Anda. Saya bekerja sama dengan Fin untuk memastikan setiap rencana investasi "
                f"dan target masa depan Anda berpijak pada arus kas aktual yang sehat, bukan sekadar angan-angan.\n\n"
                f"Apa yang ingin Anda tinjau hari ini?"
            )
            suggestions = ["Cek Kapasitas Kontribusi", "Lihat Target Masa Depan", "Mulai Review Bersama"]

        return {
            "text": text,
            "suggestions": suggestions
        }
