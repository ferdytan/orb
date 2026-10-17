"""FastAPI APIRouter for Fin & Welly Collaboration System."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from backend.collaboration.models import (
    JointReviewResponse, RecommendationResponse,
    CollaborationPermissionUpdate, CollaborationPermissionResponse,
    CollaborationAccessLogResponse
)
from backend.collaboration.service import CollaborationService

router = APIRouter(prefix="/api/collaboration", tags=["Collaboration"])


@router.get("/review", response_model=Optional[JointReviewResponse])
def get_latest_review(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    return CollaborationService.get_latest_review(period=period, user_id=1)


@router.post("/review/generate", response_model=JointReviewResponse)
def generate_review(period: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$")):
    try:
        return CollaborationService.generate_joint_review(period=period, user_id=1)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations/{rec_id}/approve")
def approve_recommendation(rec_id: int):
    try:
        return CollaborationService.approve_recommendation(recommendation_id=rec_id, user_id=1)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/recommendations/{rec_id}/apply")
def apply_recommendation(rec_id: int):
    try:
        return CollaborationService.apply_recommendation(recommendation_id=rec_id, user_id=1)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/recommendations/{rec_id}/reject")
def reject_recommendation(rec_id: int):
    try:
        return CollaborationService.reject_recommendation(recommendation_id=rec_id, user_id=1)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/permissions", response_model=CollaborationPermissionResponse)
def get_permissions():
    return CollaborationService.get_permissions(user_id=1)


@router.post("/permissions", response_model=CollaborationPermissionResponse)
def update_permissions(body: CollaborationPermissionUpdate):
    return CollaborationService.update_permissions(
        user_id=1,
        welly_read_fin_summary=body.welly_read_fin_summary,
        allowed_scope=body.allowed_scope,
        allow_external_llm=body.allow_external_llm
    )


@router.get("/audit-logs", response_model=List[CollaborationAccessLogResponse])
def get_audit_logs(limit: int = Query(50, ge=1, le=100)):
    return CollaborationService.get_audit_logs(user_id=1, limit=limit)
