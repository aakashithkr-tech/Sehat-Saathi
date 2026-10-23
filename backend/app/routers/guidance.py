from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..database import get_db
from ..schemas.guidance import GuidanceIn, GuidanceOut
from ..services import guidance_service

router = APIRouter(prefix="/api/v1/guidance", tags=["guidance"])


@router.post("", response_model=GuidanceOut, status_code=status.HTTP_200_OK)
def get_health_guidance(
    payload: GuidanceIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Structured health-information guidance and emergency safety screening.

    Accepts health-related symptoms, concerns, or queries.
    Screens deterministically for acute emergency red-flags.
    Retrieves verified health information topics and relevant care options.
    Does NOT prescribe medications or make definitive clinical diagnoses.
    """
    return guidance_service.process_guidance(db, settings, payload)
