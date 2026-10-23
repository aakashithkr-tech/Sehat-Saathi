from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.resource import CategoryOut, ResourceList, ResourceOut
from ..services import resource_service

router = APIRouter(prefix="/api/v1/resources", tags=["resources"])

Kind = Literal["information", "care"]


@router.get("", response_model=ResourceList)
def list_resources(
    kind: Kind | None = None,
    category: str | None = Query(None, max_length=100),
    language: str | None = Query(None, max_length=35),
    search: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows, total, pages = resource_service.list_resources(
        db, kind=kind, category=category, language=language, search=search, page=page, page_size=page_size
    )
    return ResourceList(
        items=[ResourceOut.model_validate(r) for r in rows], total=total, page=page, page_size=page_size, pages=pages
    )


# Must be declared before "/{resource_id}" so "categories" is not treated as an id.
@router.get("/categories", response_model=list[CategoryOut])
def categories(kind: Kind | None = None, db: Session = Depends(get_db)):
    return resource_service.list_categories(db, kind)


@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: str, db: Session = Depends(get_db)):
    row = resource_service.get_resource(db, resource_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return row
