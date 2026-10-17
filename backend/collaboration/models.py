"""Pydantic Models for Fin & Welly Collaboration System."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RecommendationResponse(BaseModel):
    id: int
    review_id: str
    author: str
    action_type: str  # 'budget_rebalance', 'goal_contribution', 'debt_focus'
    title: str
    rationale: str
    assumptions: str
    projected_impact: str
    proposed_payload: Dict[str, Any]
    status: str  # 'draft', 'approved', 'applied', 'rejected'
    created_at: str
    applied_at: Optional[str] = None


class JointReviewResponse(BaseModel):
    review_id: str
    report_id: str
    user_id: int
    period: str
    status: str
    summary_insights: str
    liquidity_assessment: str
    created_at: str
    reviewed_at: Optional[str] = None
    recommendations: List[RecommendationResponse] = []


class CollaborationPermissionUpdate(BaseModel):
    welly_read_fin_summary: bool
    allowed_scope: str = Field("aggregated_summary", pattern="^(aggregated_summary|minimal_kpi|full_details)$")
    allow_external_llm: bool = False


class CollaborationPermissionResponse(BaseModel):
    user_id: int
    welly_read_fin_summary: bool
    allowed_scope: str
    allow_external_llm: bool
    granted_at: str
    revoked_at: Optional[str] = None


class CollaborationAccessLogResponse(BaseModel):
    id: int
    user_id: int
    report_id: Optional[str]
    action: str
    accessed_at: str
