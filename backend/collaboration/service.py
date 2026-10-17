"""Collaboration Service between Fin and Welly.

Orchestrates structured snapshots from Fin and planning models from Welly to produce
verified joint reviews, draft recommendations, and idempotent user-approved applications.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.database import get_connection
from backend.agents.fin.reporting import FinSnapshotService
from backend.agents.fin.service import FinService
from backend.agents.welly.service import WellyService


class CollaborationService:

    @classmethod
    def get_permissions(cls, user_id: int = 1) -> Dict[str, Any]:
        """Retrieves active collaboration permissions for the user."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM collaboration_permissions WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "user_id": row["user_id"],
                "welly_read_fin_summary": bool(row["welly_read_fin_summary"]),
                "allowed_scope": row["allowed_scope"],
                "allow_external_llm": bool(row["allow_external_llm"]),
                "granted_at": row["granted_at"],
                "revoked_at": row["revoked_at"]
            }

        # Initialize default permissions if not present
        now = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO collaboration_permissions 
            (user_id, welly_read_fin_summary, allowed_scope, allow_external_llm, granted_at, revoked_at)
            VALUES (?, 1, 'aggregated_summary', 0, ?, NULL)
        """, (user_id, now))
        conn.commit()
        conn.close()

        return {
            "user_id": user_id,
            "welly_read_fin_summary": True,
            "allowed_scope": "aggregated_summary",
            "allow_external_llm": False,
            "granted_at": now,
            "revoked_at": None
        }

    @classmethod
    def update_permissions(cls, user_id: int = 1, welly_read_fin_summary: bool = True,
                           allowed_scope: str = "aggregated_summary", allow_external_llm: bool = False) -> Dict[str, Any]:
        """Updates permissions and timestamps revocation if access is revoked."""
        now = datetime.now().isoformat()
        revoked_at = None if welly_read_fin_summary else now

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO collaboration_permissions 
            (user_id, welly_read_fin_summary, allowed_scope, allow_external_llm, granted_at, revoked_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, 1 if welly_read_fin_summary else 0, allowed_scope, 1 if allow_external_llm else 0, now, revoked_at))
        conn.commit()
        conn.close()

        cls.log_access(user_id, None, f"permissions_updated: read_summary={welly_read_fin_summary}, scope={allowed_scope}")
        return cls.get_permissions(user_id)

    @classmethod
    def log_access(cls, user_id: int, report_id: Optional[str], action: str):
        """Audit logging for cross-agent data sharing and actions."""
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO collaboration_access_logs (user_id, report_id, action, accessed_at)
            VALUES (?, ?, ?, ?)
        """, (user_id, report_id, action, now))
        conn.commit()
        conn.close()

    @classmethod
    def get_audit_logs(cls, user_id: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM collaboration_access_logs
            WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
        """, (user_id, limit))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def generate_joint_review(cls, period: Optional[str] = None, user_id: int = 1) -> Dict[str, Any]:
        """Runs the joint review workflow synthesizing Fin's actual numbers with Welly's targets."""
        perms = cls.get_permissions(user_id)
        if not perms["welly_read_fin_summary"]:
            raise PermissionError("Welly tidak memiliki izin untuk membaca ringkasan keuangan dari Fin.")

        if not period:
            period = datetime.now().strftime("%Y-%m")

        # 1. Generate fresh structured snapshot from Fin
        snapshot = FinSnapshotService.generate_snapshot(period=period, user_id=user_id)
        report_id = snapshot["metadata"]["report_id"]
        cls.log_access(user_id, report_id, "welly_analyzed_fin_snapshot")

        # 2. Extract facts & plans
        facts = snapshot["facts"]
        plans = snapshot["plans_and_commitments"]
        surplus = snapshot["unallocated_surplus_capacity"]
        notes = snapshot["data_quality"]["missing_data_notes"]

        actual_income = facts["actual_income"]
        actual_expense = facts["actual_expense"]
        net_cashflow = facts["net_cashflow"]
        liquid_balance = facts["liquid_balance"]
        unalloc_surplus = surplus["unallocated_liquid_surplus"]
        free_cashflow = surplus["monthly_free_cashflow_potential"]

        # 3. Fetch Welly's wealth plans
        wealth_plans = WellyService.list_wealth_plans(user_id=user_id)
        total_monthly_target = sum(p["monthly_contribution_target"] for p in wealth_plans)

        # 4. Formulate Joint Synthesized Insights
        insights_lines = [
            f"**Fin (Arus Kas Aktual):** Pemasukan tercatat Rp {actual_income:,}, Pengeluaran Rp {actual_expense:,} (Arus Kas Bersih: Rp {net_cashflow:,}).",
            f"**Welly (Kapasitas Kontribusi):** Potensi arus kas bebas bulanan Rp {free_cashflow:,} dibandingkan target bulanan Rp {total_monthly_target:,}."
        ]
        if notes:
            insights_lines.append(f"**Catatan Data:** {'; '.join(notes)}")

        summary_insights = "\n".join(insights_lines)

        # 5. Liquidity & Risk Assessment
        if unalloc_surplus > (actual_expense * 3) and unalloc_surplus > 0:
            liquidity_assessment = (
                f"Likuiditas sangat kuat. Saldo likuid bebas (Rp {unalloc_surplus:,}) melampaui buffer 3 bulan pengeluaran. "
                f"Aman untuk mengalokasikan ke target kekayaan jangka panjang."
            )
        elif unalloc_surplus > 0:
            liquidity_assessment = (
                f"Likuiditas moderat. Tersedia saldo bebas Rp {unalloc_surplus:,}. "
                f"Disarankan mengutamakan pemenuhan dana darurat sebelum agresif menambah portofolio berisiko."
            )
        else:
            liquidity_assessment = (
                "Likuiditas ketat. Tidak ada saldo likuid bebas yang teridentifikasi setelah memperhitungkan dana yang dicadangkan. "
                "Fokuskan pada pengendalian pengeluaran harian di Fin."
            )

        review_id = f"rev_{period}_{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()

        # 6. Save Review Header
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO joint_reviews 
            (review_id, report_id, user_id, period, status, summary_insights, liquidity_assessment, created_at, reviewed_at)
            VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)
        """, (review_id, report_id, user_id, period, summary_insights, liquidity_assessment, now, now))

        # 7. Generate Concrete Recommendations (Drafts)
        recommendations = []

        # Recommendation A: Target Allocation / Contribution if surplus exists
        if unalloc_surplus > 0 and wealth_plans:
            target_plan = wealth_plans[0]
            alloc_amount = min(unalloc_surplus, target_plan["monthly_contribution_target"] or 500000)
            rec_title = f"Alokasikan Rp {alloc_amount:,} ke '{target_plan['title']}'"
            rec_rationale = (
                f"Berdasarkan audit Fin, Anda memiliki saldo likuid bebas Rp {unalloc_surplus:,} yang belum dialokasikan ke pos manapun."
            )
            rec_assumptions = "Saldo bebas tidak diperlukan untuk kewajiban mendesak dalam 30 hari ke depan."
            rec_impact = f"Meningkatkan progres target '{target_plan['title']}' tanpa mengganggu likuiditas harian."
            payload = {
                "action_type": "set_goal_allocation",
                "plan_id": target_plan["id"],
                "allocated_amount": alloc_amount
            }

            cursor.execute("""
                INSERT INTO joint_recommendations
                (review_id, author, action_type, title, rationale, assumptions, projected_impact, proposed_payload, status, created_at)
                VALUES (?, 'Welly', 'goal_contribution', ?, ?, ?, ?, ?, 'draft', ?)
            """, (review_id, rec_title, rec_rationale, rec_assumptions, rec_impact, json.dumps(payload), now))
            rec_id = cursor.lastrowid
            recommendations.append({
                "id": rec_id,
                "review_id": review_id,
                "author": "Welly",
                "action_type": "goal_contribution",
                "title": rec_title,
                "rationale": rec_rationale,
                "assumptions": rec_assumptions,
                "projected_impact": rec_impact,
                "proposed_payload": payload,
                "status": "draft",
                "created_at": now,
                "applied_at": None
            })

        # Recommendation B: Budget Discipline in Fin
        overbudget_items = [b for b in plans["budget_realization"] if b["percentage_used"] > 80]
        if overbudget_items:
            item = overbudget_items[0]
            rec_title = f"Perketat Batas Pengeluaran Kategori '{item['name']}'"
            rec_rationale = f"Realisasi anggaran {item['name']} telah mencapai {item['percentage_used']}%. Pengetatan diperlukan agar tidak memicu defisit kas."
            rec_assumptions = "Pengeluaran sisa bulan dapat dialihkan atau ditunda."
            rec_impact = "Menjaga arus kas operasional tetap surplus hingga akhir periode."
            payload = {
                "action_type": "budget_rebalance",
                "category_id": item["category_id"],
                "suggested_limit": item["limit_amount"]
            }
            cursor.execute("""
                INSERT INTO joint_recommendations
                (review_id, author, action_type, title, rationale, assumptions, projected_impact, proposed_payload, status, created_at)
                VALUES (?, 'Fin', 'budget_rebalance', ?, ?, ?, ?, ?, 'draft', ?)
            """, (review_id, rec_title, rec_rationale, rec_assumptions, rec_impact, json.dumps(payload), now))
            rec_id = cursor.lastrowid
            recommendations.append({
                "id": rec_id,
                "review_id": review_id,
                "author": "Fin",
                "action_type": "budget_rebalance",
                "title": rec_title,
                "rationale": rec_rationale,
                "assumptions": rec_assumptions,
                "projected_impact": rec_impact,
                "proposed_payload": payload,
                "status": "draft",
                "created_at": now,
                "applied_at": None
            })

        conn.commit()
        conn.close()

        cls.log_access(user_id, report_id, f"generated_joint_review_{review_id}")

        return {
            "review_id": review_id,
            "report_id": report_id,
            "user_id": user_id,
            "period": period,
            "status": "completed",
            "summary_insights": summary_insights,
            "liquidity_assessment": liquidity_assessment,
            "created_at": now,
            "reviewed_at": now,
            "recommendations": recommendations
        }

    @classmethod
    def get_latest_review(cls, period: Optional[str] = None, user_id: int = 1) -> Optional[Dict[str, Any]]:
        """Retrieves the latest joint review or triggers one if none exists."""
        if not period:
            period = datetime.now().strftime("%Y-%m")

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM joint_reviews 
            WHERE user_id = ? AND period = ?
            ORDER BY created_at DESC LIMIT 1
        """, (user_id, period))
        row = cursor.fetchone()

        if not row:
            conn.close()
            # Generate new review
            try:
                return cls.generate_joint_review(period=period, user_id=user_id)
            except Exception:
                return None

        review = dict(row)
        cursor.execute("SELECT * FROM joint_recommendations WHERE review_id = ? ORDER BY id ASC", (review["review_id"],))
        rec_rows = cursor.fetchall()
        conn.close()

        recs = []
        for r in rec_rows:
            item = dict(r)
            item["proposed_payload"] = json.loads(item["proposed_payload"]) if item["proposed_payload"] else {}
            recs.append(item)

        review["recommendations"] = recs
        return review

    @classmethod
    def approve_recommendation(cls, recommendation_id: int, user_id: int = 1) -> Dict[str, Any]:
        """Marks a recommendation as approved by user."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM joint_recommendations WHERE id = ?", (recommendation_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Rekomendasi tidak ditemukan.")

        cursor.execute("UPDATE joint_recommendations SET status = 'approved' WHERE id = ?", (recommendation_id,))
        conn.commit()
        conn.close()

        cls.log_access(user_id, row["review_id"], f"approved_recommendation_{recommendation_id}")
        return {"status": "approved", "id": recommendation_id}

    @classmethod
    def apply_recommendation(cls, recommendation_id: int, user_id: int = 1) -> Dict[str, Any]:
        """Applies an approved recommendation idempotently to the target workspace without creating fake bank transfers."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM joint_recommendations WHERE id = ?", (recommendation_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Rekomendasi tidak ditemukan.")

        rec = dict(row)
        # Idempotency check: if already applied, return immediately
        if rec["status"] == "applied":
            conn.close()
            return {"status": "already_applied", "id": recommendation_id, "applied_at": rec["applied_at"]}

        payload = json.loads(rec["proposed_payload"]) if rec["proposed_payload"] else {}
        action = payload.get("action_type") or rec["action_type"]
        now = datetime.now().isoformat()

        # Idempotent apply actions
        if action == "set_goal_allocation":
            plan_id = payload.get("plan_id")
            allocated_amount = payload.get("allocated_amount", 0)
            if plan_id and allocated_amount > 0:
                # Update current_amount in Welly plan
                cursor.execute("""
                    UPDATE welly_wealth_plans 
                    SET current_amount = current_amount + ?, updated_at = ?
                    WHERE id = ? AND user_id = ?
                """, (allocated_amount, now, plan_id, user_id))

        elif action == "budget_rebalance":
            category_id = payload.get("category_id")
            limit_val = payload.get("suggested_limit")
            period = datetime.now().strftime("%Y-%m")
            if category_id and limit_val is not None:
                cursor.execute("""
                    INSERT INTO fin_budgets (category_id, period, limit_amount, created_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(category_id, period) DO UPDATE SET limit_amount = ?
                """, (category_id, period, limit_val, now, limit_val))

        cursor.execute("""
            UPDATE joint_recommendations 
            SET status = 'applied', applied_at = ?
            WHERE id = ?
        """, (now, recommendation_id))

        conn.commit()
        conn.close()

        cls.log_access(user_id, rec["review_id"], f"applied_recommendation_{recommendation_id}")
        return {"status": "applied", "id": recommendation_id, "applied_at": now}

    @classmethod
    def reject_recommendation(cls, recommendation_id: int, user_id: int = 1) -> Dict[str, Any]:
        """Rejects a recommendation."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM joint_recommendations WHERE id = ?", (recommendation_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Rekomendasi tidak ditemukan.")

        cursor.execute("UPDATE joint_recommendations SET status = 'rejected' WHERE id = ?", (recommendation_id,))
        conn.commit()
        conn.close()

        cls.log_access(user_id, row["review_id"], f"rejected_recommendation_{recommendation_id}")
        return {"status": "rejected", "id": recommendation_id}
