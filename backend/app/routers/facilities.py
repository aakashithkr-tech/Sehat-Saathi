from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.facility import FacilityListResponse
from ..services import facility_service

router = APIRouter(tags=["facilities"])


@router.get("/api/facilities", response_model=FacilityListResponse)
@router.get("/api/v1/facilities", response_model=FacilityListResponse)
def get_facilities(
    pincode: str | None = Query(None, description="6-digit Indian PIN code (e.g. 201001)"),
    city: str | None = Query(None, max_length=100, description="City or region name"),
    facility_type: str | None = Query(None, description="hospital, phc, clinic, emergency, or all"),
    search: str | None = Query(None, max_length=100, description="Keyword search across name, address, or service"),
    db: Session = Depends(get_db),
) -> FacilityListResponse:
    """Find nearby healthcare facilities with availability status and service details."""
    return facility_service.search_facilities(
        db=db,
        pincode=pincode,
        city=city,
        facility_type=facility_type,
        search=search,
    )
