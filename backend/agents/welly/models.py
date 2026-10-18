"""Pydantic Models for Welly Agent (Wealth & Future Planning)."""

from typing import Optional, List
from pydantic import BaseModel, Field


class WealthPlanCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    target_amount: int = Field(..., ge=0)
    current_amount: int = Field(0, ge=0)
    monthly_contribution_target: int = Field(0, ge=0)
    risk_profile: str = Field("moderate", pattern="^(conservative|moderate|aggressive)$")
    horizon_years: int = Field(5, ge=1, le=50)


class WealthPlanUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    target_amount: Optional[int] = Field(None, ge=0)
    current_amount: Optional[int] = Field(None, ge=0)
    monthly_contribution_target: Optional[int] = Field(None, ge=0)
    risk_profile: Optional[str] = Field(None, pattern="^(conservative|moderate|aggressive)$")
    horizon_years: Optional[int] = Field(None, ge=1, le=50)


class WealthPlanResponse(BaseModel):
    id: int
    user_id: int
    title: str
    target_amount: int
    current_amount: int
    monthly_contribution_target: int
    risk_profile: str
    horizon_years: int
    progress_percentage: float
    created_at: str
    updated_at: str


class CapacityEvaluationResponse(BaseModel):
    user_id: int
    period: str
    unallocated_liquid_surplus: int
    monthly_free_cashflow_potential: int
    monthly_contribution_target: int
    capacity_ratio_pct: float
    readiness_level: str  # 'ready', 'tight', 'insufficient_data', 'deficit'
    recommendations: List[str]


class AskWellyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class AskWellyResponse(BaseModel):
    text: str
    suggestions: List[str] = []


class InvestmentCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    icon: Optional[str] = "📈"
    color: Optional[str] = "#3B82F6"
    sort_order: Optional[int] = 0


class InvestmentCategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = "📈"
    color: Optional[str] = "#3B82F6"
    sort_order: Optional[int] = 0


class InvestmentAccountCreate(BaseModel):
    category_id: Optional[int] = None
    category_name: str
    platform_name: str
    account_identifier: str
    credential_secret: Optional[str] = ""
    notes: Optional[str] = ""
    current_balance: Optional[int] = 0


class InvestmentAccountUpdate(BaseModel):
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    platform_name: Optional[str] = None
    account_identifier: Optional[str] = None
    credential_secret: Optional[str] = None
    notes: Optional[str] = None
    current_balance: Optional[int] = None
    is_active: Optional[int] = None


class InvestmentAccountResponse(BaseModel):
    id: int
    category_id: Optional[int] = None
    category_name: str
    platform_name: str
    account_identifier: str
    credential_secret: Optional[str] = "••••••••"
    notes: Optional[str] = ""
    current_balance: int = 0
    is_active: int = 1
    created_at: str
    updated_at: str


class VerifyPinRequest(BaseModel):
    pin: str

