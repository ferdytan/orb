"""Pydantic models and schemas for Fin Personal Finance Workspace."""

from typing import List, Optional
from pydantic import BaseModel, Field


# ==========================================
# Account Schemas
# ==========================================
class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: str = Field(default="cash", description="cash, bank, ewallet, investment")
    initial_balance: int = Field(default=0, ge=0, description="Saldo awal integer Rupiah")
    currency: str = Field(default="IDR")
    icon: Optional[str] = "👛"
    color: Optional[str] = "#10B981"


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[int] = None


class AccountResponse(BaseModel):
    id: int
    name: str
    account_type: str
    balance: int
    currency: str
    icon: str
    color: str
    is_active: int
    created_at: str
    updated_at: str


# ==========================================
# Category Schemas
# ==========================================
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    type: str = Field(..., pattern="^(expense|income)$")
    icon: Optional[str] = "🏷️"
    color: Optional[str] = "#3B82F6"
    sort_order: Optional[int] = 0


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    icon: str
    color: str
    sort_order: int


# ==========================================
# Transaction Schemas
# ==========================================
class TransactionCreate(BaseModel):
    type: str = Field(..., pattern="^(expense|income|transfer)$")
    account_id: int
    destination_account_id: Optional[int] = None  # required if type == 'transfer'
    category_id: Optional[int] = None
    amount: int = Field(..., gt=0, description="Nilai transaksi dalam integer Rupiah murni")
    description: str = Field(..., min_length=1, max_length=255)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Format YYYY-MM-DD")
    time: Optional[str] = Field(default="", description="Format HH:MM")
    tags: Optional[str] = ""
    is_cleared: Optional[int] = 1


class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    destination_account_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    tags: Optional[str] = None
    is_cleared: Optional[int] = None


class TransactionResponse(BaseModel):
    id: int
    type: str
    account_id: int
    account_name: Optional[str] = None
    destination_account_id: Optional[int] = None
    destination_account_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    amount: int
    description: str
    date: str
    time: str
    tags: str
    is_cleared: int
    created_at: str


# ==========================================
# Budget Schemas
# ==========================================
class BudgetSet(BaseModel):
    category_id: int
    period: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Format YYYY-MM")
    limit_amount: int = Field(..., ge=0, description="Batas anggaran dalam integer Rupiah")


class BudgetResponse(BaseModel):
    id: int
    category_id: int
    category_name: str
    category_icon: str
    category_color: str
    period: str
    limit_amount: int
    spent_amount: int
    utilization_pct: int
    remaining_amount: int
    is_over_budget: bool


# ==========================================
# Reminder Schemas
# ==========================================
class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1)
    amount: int = Field(..., gt=0)
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    frequency: Optional[str] = "monthly"  # once, weekly, monthly, yearly
    category_id: Optional[int] = None
    account_id: Optional[int] = None


class ReminderResponse(BaseModel):
    id: int
    title: str
    amount: int
    due_date: str
    frequency: str
    is_paid: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    account_id: Optional[int] = None
    days_until_due: int
    is_overdue: bool
    created_at: str


# ==========================================
# Goal Schemas
# ==========================================
class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1)
    target_amount: int = Field(..., gt=0)
    current_amount: Optional[int] = 0
    target_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    icon: Optional[str] = "🎯"


class GoalDeposit(BaseModel):
    amount: int = Field(..., gt=0)
    source_account_id: Optional[int] = None


class GoalResponse(BaseModel):
    id: int
    title: str
    target_amount: int
    current_amount: int
    target_date: str
    progress_pct: int
    is_completed: int
    icon: str
    created_at: str


# ==========================================
# Executive Brief (For Office View - ZERO RUPIAH)
# ==========================================
class ExecutiveBriefWidget(BaseModel):
    id: str
    title: str
    percentage: Optional[int] = None  # None if denominator is 0
    status_text: str
    status_tone: str  # 'good', 'warning', 'danger', 'neutral'
    indicator_note: str


class ExecutiveBriefResponse(BaseModel):
    has_data: bool
    budget_utilization: ExecutiveBriefWidget
    recording_coverage: ExecutiveBriefWidget
    savings_allocation: ExecutiveBriefWidget
    upcoming_obligations: ExecutiveBriefWidget
    insights: List[str]
    quick_tips: str
    fin_status: str  # 'active', 'ready', 'awaiting_data'


# ==========================================
# Fin Workspace Summary
# ==========================================
class CategoryBreakdownItem(BaseModel):
    category_id: int
    name: str
    icon: str
    color: str
    amount: int
    percentage: int


class FinancialSummaryResponse(BaseModel):
    current_period: str
    total_net_worth: int
    total_income: int
    total_expense: int
    net_savings: int
    savings_rate_pct: int
    total_budget_limit: int
    total_budget_spent: int
    overall_budget_utilization_pct: int
    accounts_count: int
    transactions_count: int
    unpaid_reminders_count: int
    category_breakdown: List[CategoryBreakdownItem]


# ==========================================
# Tanya Fin (Deterministic NLP Assistant)
# ==========================================
class AskFinRequest(BaseModel):
    message: str


class AskFinResponse(BaseModel):
    answer: str
    intent: str
    suggestions: List[str] = []
