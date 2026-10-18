"""FastAPI APIRouter for Fin Personal Finance Workspace."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from backend.agents.fin.models import (
    AccountCreate, AccountResponse,
    CategoryResponse,
    TransactionCreate, TransactionResponse,
    BudgetSet, BudgetResponse,
    ReminderCreate, ReminderResponse,
    GoalCreate, GoalDeposit, GoalResponse,
    ExecutiveBriefResponse, FinancialSummaryResponse,
    AskFinRequest, AskFinResponse,
    TransferCreate, TransferResponse,
    ReserveCreate, ReserveUpdate, ReserveResponse
)
from backend.agents.fin.service import FinService
from backend.agents.fin.reporting import FinSnapshotService

router = APIRouter(prefix="/api/agents/fin", tags=["Fin Agent"])


# ==========================================
# Executive Brief & Financial Summary
# ==========================================

@router.get("/brief", response_model=ExecutiveBriefResponse)
def get_fin_executive_brief():
    """Returns strict percentage & statistical overview for Office screen. ZERO RUPIAH."""
    return FinService.get_executive_brief()


@router.get("/summary", response_model=FinancialSummaryResponse)
def get_fin_summary(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    """Returns comprehensive financial totals and category breakdown for Fin Workspace."""
    return FinService.get_financial_summary(period)


@router.get("/snapshot")
def get_fin_snapshot(
    period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    refresh: bool = False
):
    """Returns structured snapshot conforming to fin.snapshot.v1."""
    if refresh:
        return FinSnapshotService.generate_snapshot(period=period)
    return FinSnapshotService.get_latest_snapshot(period=period)


@router.post("/snapshot/generate")
def generate_fin_snapshot(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    """Forces generation of a new structured financial snapshot."""
    return FinSnapshotService.generate_snapshot(period=period)


# ==========================================
# Accounts
# ==========================================

@router.get("/accounts", response_model=List[AccountResponse])
def get_accounts(active_only: bool = True):
    return FinService.list_accounts(active_only=active_only)


@router.post("/accounts", response_model=AccountResponse)
def create_account(body: AccountCreate):
    return FinService.create_account(
        name=body.name,
        account_type=body.account_type,
        initial_balance=body.initial_balance,
        currency=body.currency,
        icon=body.icon or "👛",
        color=body.color or "#10B981",
        bank_name=body.bank_name,
        account_number=body.account_number
    )


# ==========================================
# Categories
# ==========================================

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(type: Optional[str] = Query(None, pattern="^(expense|income)$")):
    return FinService.list_categories(cat_type=type)


# ==========================================
# Transactions
# ==========================================

@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(
    period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    type: Optional[str] = Query(None, pattern="^(expense|income|transfer)$"),
    account_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500)
):
    return FinService.list_transactions(period=period, tx_type=type, account_id=account_id, limit=limit)


@router.post("/transactions", response_model=TransactionResponse)
def create_transaction(body: TransactionCreate):
    try:
        return FinService.create_transaction(
            tx_type=body.type,
            account_id=body.account_id,
            amount=body.amount,
            description=body.description,
            date_str=body.date,
            time_str=body.time or "",
            category_id=body.category_id,
            destination_account_id=body.destination_account_id,
            tags=body.tags or ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/transactions/{tx_id}")
def delete_transaction(tx_id: int):
    success = FinService.delete_transaction(tx_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return {"status": "deleted", "id": tx_id}


# ==========================================
# Budgets
# ==========================================

@router.get("/budgets", response_model=List[BudgetResponse])
def get_budgets(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    return FinService.list_budgets(period=period)


@router.post("/budgets")
def set_budget(body: BudgetSet):
    return FinService.set_budget(
        category_id=body.category_id,
        period=body.period,
        limit_amount=body.limit_amount
    )


# ==========================================
# Reminders / Bills
# ==========================================

@router.get("/reminders", response_model=List[ReminderResponse])
def get_reminders():
    return FinService.list_reminders()


@router.post("/reminders")
def create_reminder(body: ReminderCreate):
    return FinService.create_reminder(
        title=body.title,
        amount=body.amount,
        due_date=body.due_date,
        frequency=body.frequency or "monthly",
        category_id=body.category_id,
        account_id=body.account_id
    )


@router.post("/reminders/{rem_id}/pay")
def pay_reminder(rem_id: int, account_id: Optional[int] = None):
    try:
        return FinService.pay_reminder(reminder_id=rem_id, account_id=account_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# Savings Goals
# ==========================================

@router.get("/goals", response_model=List[GoalResponse])
def get_goals():
    return FinService.list_goals()


@router.post("/goals")
def create_goal(body: GoalCreate):
    return FinService.create_goal(
        title=body.title,
        target_amount=body.target_amount,
        target_date=body.target_date,
        current_amount=body.current_amount or 0,
        icon=body.icon or "🎯"
    )


@router.post("/goals/{goal_id}/deposit")
def deposit_goal(goal_id: int, body: GoalDeposit):
    try:
        return FinService.deposit_goal(
            goal_id=goal_id,
            amount=body.amount,
            source_account_id=body.source_account_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# Tanya Fin & Export
# ==========================================

@router.post("/ask", response_model=AskFinResponse)
def ask_fin(body: AskFinRequest):
    return FinService.ask_fin(body.message)


@router.get("/export")
def export_csv(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    csv_content = FinService.export_csv(period=period)
    filename = f"orb_fin_transaksi_{period or 'all'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ==========================================
# Transfers Antar-Rekening
# ==========================================

@router.get("/transfers", response_model=List[TransferResponse])
def get_transfers(limit: int = Query(50, ge=1, le=200)):
    return FinService.list_transfers(limit=limit)


@router.post("/transfers", response_model=TransferResponse)
def create_transfer(body: TransferCreate):
    try:
        return FinService.create_transfer(
            source_account_id=body.source_account_id,
            destination_account_id=body.destination_account_id,
            amount=body.amount,
            fee=body.fee or 0,
            notes=body.notes or "",
            date_str=body.date
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# Dana Cadangan / Reserves
# ==========================================

@router.get("/reserves", response_model=List[ReserveResponse])
def get_reserves():
    return FinService.list_reserves()


@router.post("/reserves", response_model=ReserveResponse)
def create_reserve(body: ReserveCreate):
    return FinService.create_reserve(
        name=body.name,
        target_amount=body.target_amount,
        allocated_amount=body.allocated_amount or 0,
        account_id=body.account_id,
        category=body.category or "Dana Darurat",
        notes=body.notes or "",
        target_date=body.target_date
    )


@router.put("/reserves/{reserve_id}", response_model=ReserveResponse)
def update_reserve(reserve_id: int, body: ReserveUpdate):
    res = FinService.update_reserve(
        reserve_id=reserve_id,
        allocated_amount=body.allocated_amount,
        target_amount=body.target_amount,
        is_completed=body.is_completed,
        notes=body.notes
    )
    if not res:
        raise HTTPException(status_code=404, detail="Cadangan tidak ditemukan")
    return res


@router.delete("/reserves/{reserve_id}")
def delete_reserve(reserve_id: int):
    success = FinService.delete_reserve(reserve_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cadangan tidak ditemukan")
    return {"status": "success", "message": "Dana cadangan dihapus"}

