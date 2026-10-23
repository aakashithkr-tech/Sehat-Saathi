import math

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..models import Resource


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _filters(kind: str | None, category: str | None, language: str | None, search: str | None, location: str | None = None):
    conds = [Resource.active.is_(True)]
    if kind:
        conds.append(Resource.kind == kind)
    if category:
        conds.append(func.lower(Resource.category) == category.lower())
    if language:
        conds.append(func.lower(Resource.language) == language.lower())
    if location and location.strip():
        conds.append(Resource.location.ilike(f"%{_esc(location.strip())}%", escape="\\"))
    if search and search.strip():
        like = f"%{_esc(search.strip())}%"
        conds.append(
            or_(*(col.ilike(like, escape="\\") for col in (Resource.title, Resource.summary, Resource.category, Resource.provider, Resource.location)))
        )
    return conds


def list_resources(db: Session, *, kind, category, language, search, page: int, page_size: int, location: str | None = None):
    conds = _filters(kind, category, language, search, location)

    total = db.scalar(select(func.count()).select_from(Resource).where(*conds)) or 0
    rows = db.scalars(
        select(Resource)
        .where(*conds)
        .order_by(Resource.category, Resource.title, Resource.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return rows, total, max(1, math.ceil(total / page_size))


def get_resource(db: Session, resource_id: str) -> Resource | None:
    return db.scalar(select(Resource).where(Resource.id == resource_id, Resource.active.is_(True)))


def list_categories(db: Session, kind: str | None):
    conds = [Resource.active.is_(True)]
    if kind:
        conds.append(Resource.kind == kind)
    rows = db.execute(
        select(Resource.category, func.count()).where(*conds).group_by(Resource.category).order_by(Resource.category)
    ).all()
    return [{"name": n, "count": c} for n, c in rows]
