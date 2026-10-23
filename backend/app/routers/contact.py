from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..database import get_db
from ..schemas.contact import ContactIn, ContactOut
from ..services import contact_service
from ..services.rate_limit import contact_limiter

router = APIRouter(prefix="/api/v1", tags=["contact"])


def client_id(request: Request, settings: Settings) -> str:
    if settings.trust_proxy_headers:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Deliberately no GET: stored messages are private.
@router.post("/contact", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    cid = client_id(request, settings)
    retry = contact_limiter.check(cid, settings.contact_rate_limit, settings.contact_rate_window_seconds)
    if retry:
        raise HTTPException(
            status_code=429,
            detail="Too many messages sent from your connection. Please wait a little and try again.",
            headers={"Retry-After": str(retry)},
        )
    result = contact_service.submit(db, settings, payload, cid)
    if result.duplicate:
        response.status_code = status.HTTP_200_OK
    return result
