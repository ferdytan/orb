"""FastAPI APIRouter for Welly Wealth Planning Agent."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.agents.welly.models import (
    WealthPlanCreate, WealthPlanUpdate, WealthPlanResponse,
    CapacityEvaluationResponse, AskWellyRequest, AskWellyResponse
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
