"""Seed / import resources.

  python -m app.seed                       # load labelled SAMPLE data if the table is empty
  python -m app.seed --file my.json        # upsert verified records (see README for the format)
  python -m app.seed --file my.json --remove-samples
"""
import argparse
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from .models import Resource

SAMPLE_FILE = Path(__file__).resolve().parent.parent / "data" / "resources.sample.json"
VERIFIED_FILE = Path(__file__).resolve().parent.parent / "data" / "verified_resources.json"
FIELDS = {"kind", "title", "summary", "category", "provider", "url", "contact", "language", "location", "source", "active"}


def _load(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("resource file must contain a JSON array")
    return data


def upsert(db: Session, records: list[dict], *, is_sample: bool) -> int:
    n = 0
    for rec in records:
        missing = [k for k in ("id", "kind", "title", "summary", "category", "source") if not rec.get(k)]
        if missing:
            raise ValueError(f"record {rec.get('id') or rec.get('title')!r} is missing: {', '.join(missing)}")
        if rec["kind"] not in ("information", "care"):
            raise ValueError(f"record {rec['id']!r}: kind must be 'information' or 'care'")
        row = db.scalar(select(Resource).where(Resource.id == str(rec["id"])))
        if row is None:
            row = Resource(id=str(rec["id"]))
            db.add(row)
        for k in FIELDS & rec.keys():
            setattr(row, k, rec[k])
        row.is_sample = is_sample
        lv = rec.get("last_verified_at")
        row.last_verified_at = datetime.fromisoformat(lv) if lv else None
        n += 1
    db.commit()
    return n


def seed_samples_if_empty(db: Session) -> int:
    if db.scalar(select(Resource.id).limit(1)) is not None:
        return 0
    return upsert(db, _load(SAMPLE_FILE), is_sample=True)


FACILITIES_SAMPLE_FILE = Path(__file__).resolve().parent.parent / "data" / "facilities.sample.json"


def seed_facilities_if_empty(db: Session) -> int:
    from .models import Facility

    if db.scalar(select(Facility.id).limit(1)) is not None:
        return 0
    if not FACILITIES_SAMPLE_FILE.exists():
        return 0
    records = _load(FACILITIES_SAMPLE_FILE)
    n = 0
    for rec in records:
        services = rec.get("services", [])
        services_str = json.dumps(services) if isinstance(services, list) else str(services)
        lv = rec.get("last_verified_at")
        fac = Facility(
            id=str(rec["id"]),
            name=rec["name"],
            facility_type=rec["facility_type"],
            address=rec["address"],
            pincode=str(rec["pincode"]),
            city=rec["city"],
            state=rec.get("state", ""),
            latitude=rec.get("latitude"),
            longitude=rec.get("longitude"),
            contact=rec.get("contact"),
            opening_hours=rec.get("opening_hours"),
            services=services_str,
            status_label=rec.get("status_label", "Demo data"),
            is_sample=bool(rec.get("is_sample", True)),
            exists_in_directory=bool(rec.get("exists_in_directory", True)),
            doctor_availability=rec.get("doctor_availability"),
            bed_availability=rec.get("bed_availability"),
            source=rec.get("source", "DEMO DATA — availability not live-verified"),
            last_verified_at=datetime.fromisoformat(lv) if lv else None,
        )
        db.add(fac)
        n += 1
    db.commit()
    return n


def seed_verified_resources(db: Session) -> int:

    if not VERIFIED_FILE.exists():
        return 0
    return upsert(db, _load(VERIFIED_FILE), is_sample=False)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", type=Path)
    ap.add_argument("--verified", action="store_true", help="Load bundled verified healthcare resources")
    ap.add_argument("--remove-samples", action="store_true")
    args = ap.parse_args()
    init_db()
    with SessionLocal() as db:
        if args.verified:
            n = seed_verified_resources(db)
            print(f"Imported {n} verified record(s) from bundled verified_resources.json")
            if args.remove_samples:
                db.execute(delete(Resource).where(Resource.is_sample.is_(True)))
                db.commit()
                print("Removed sample records")
        elif args.file:
            n = upsert(db, _load(args.file), is_sample=False)
            print(f"Imported {n} verified record(s) from {args.file}")
            if args.remove_samples:
                db.execute(delete(Resource).where(Resource.is_sample.is_(True)))
                db.commit()
                print("Removed sample records")
        else:
            print(f"Seeded {seed_samples_if_empty(db)} sample record(s)")


if __name__ == "__main__":
    main()

