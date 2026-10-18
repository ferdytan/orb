"""FastAPI APIRouter for Welly Wealth Planning Agent."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.agents.welly.models import (
    WealthPlanCreate, WealthPlanUpdate, WealthPlanResponse,
    CapacityEvaluationResponse, AskWellyRequest, AskWellyResponse,
    InvestmentCategoryCreate, InvestmentCategoryResponse,
    InvestmentAccountCreate, InvestmentAccountUpdate, InvestmentAccountResponse,
    VerifyPinRequest
)
from backend.agents.welly.service import WellyService

router = APIRouter(prefix="/api/agents/welly", tags=["Welly Agent"])


@router.get("/plans", response_model=List[WealthPlanResponse])
def get_wealth_plans():
    return WellyService.list_wealth_plans(user_id=1)


@router.post("/plans", response_model=WealthPlanResponse)
def create_wealth_plan(body: WealthPlanCreate):
    return WellyService.create_wealth_plan(
        user_id=1,
        title=body.title,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        monthly_contribution_target=body.monthly_contribution_target,
        risk_profile=body.risk_profile,
        horizon_years=body.horizon_years
    )


@router.patch("/plans/{plan_id}", response_model=WealthPlanResponse)
def update_wealth_plan(plan_id: int, body: WealthPlanUpdate):
    updated = WellyService.update_wealth_plan(
        plan_id=plan_id,
        user_id=1,
        **body.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Rencana kekayaan tidak ditemukan")
    return updated


@router.delete("/plans/{plan_id}")
def delete_wealth_plan(plan_id: int):
    success = WellyService.delete_wealth_plan(plan_id=plan_id, user_id=1)
    if not success:
        raise HTTPException(status_code=404, detail="Rencana kekayaan tidak ditemukan")
    return {"status": "deleted", "id": plan_id}


@router.get("/capacity", response_model=CapacityEvaluationResponse)
def evaluate_capacity(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    return WellyService.evaluate_contribution_capacity(period=period, user_id=1)


@router.post("/ask", response_model=AskWellyResponse)
def ask_welly(body: AskWellyRequest):
    return WellyService.ask_welly(message=body.message, user_id=1)


# ==========================================
# Investment Categories & Accounts Endpoints
# ==========================================

@router.get("/categories", response_model=List[InvestmentCategoryResponse])
def get_investment_categories():
    return WellyService.list_categories()


@router.post("/categories", response_model=InvestmentCategoryResponse)
def create_investment_category(body: InvestmentCategoryCreate):
    return WellyService.create_category(
        name=body.name,
        icon=body.icon or "📈",
        color=body.color or "#3B82F6",
        sort_order=body.sort_order or 0
    )


@router.delete("/categories/{category_id}")
def delete_investment_category(category_id: int):
    success = WellyService.delete_category(category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    return {"status": "deleted", "id": category_id}


@router.get("/accounts", response_model=List[InvestmentAccountResponse])
def get_investment_accounts(pin: Optional[str] = Query(None)):
    return WellyService.list_accounts(pin=pin)


@router.post("/accounts", response_model=InvestmentAccountResponse)
def create_investment_account(body: InvestmentAccountCreate):
    return WellyService.create_account(
        category_name=body.category_name,
        platform_name=body.platform_name,
        account_identifier=body.account_identifier,
        category_id=body.category_id,
        credential_secret=body.credential_secret or "",
        notes=body.notes or "",
        current_balance=body.current_balance or 0
    )


@router.patch("/accounts/{account_id}", response_model=InvestmentAccountResponse)
def update_investment_account(account_id: int, body: InvestmentAccountUpdate):
    updated = WellyService.update_account(
        account_id=account_id,
        **body.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Akun investasi tidak ditemukan")
    return updated


@router.delete("/accounts/{account_id}")
def delete_investment_account(account_id: int):
    success = WellyService.delete_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Akun investasi tidak ditemukan")
    return {"status": "deleted", "id": account_id}


@router.post("/verify-pin")
def verify_investment_pin(body: VerifyPinRequest):
    valid = WellyService.verify_pin(body.pin)
    if not valid:
        raise HTTPException(status_code=401, detail="PIN salah. Silakan coba kembali.")
    return {"status": "success", "unlocked": True}

