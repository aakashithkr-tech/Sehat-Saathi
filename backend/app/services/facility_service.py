import json
import logging
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.facility import Facility
from ..schemas.facility import FacilityListResponse, FacilityOut

log = logging.getLogger("sehat.facilities")

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
SAMPLE_FILE = DATA_DIR / "facilities.sample.json"

_cached_samples: list[dict[str, Any]] | None = None


def load_sample_facilities() -> list[dict[str, Any]]:
    global _cached_samples
    if _cached_samples is not None:
        return _cached_samples
    if SAMPLE_FILE.exists():
        try:
            with open(SAMPLE_FILE, encoding="utf-8") as f:
                _cached_samples = json.load(f)
                return _cached_samples
        except Exception as e:
            log.error("Failed to load sample facilities: %s", e)
    _cached_samples = []
    return _cached_samples


def get_all_facilities(db: Session | None = None) -> list[dict[str, Any]]:
    """Fetch all active facilities from DB if present, else fallback to sample JSON."""
    if db is not None:
        try:
            db_records = db.query(Facility).filter(Facility.active.is_(True)).all()
            if db_records:
                records = []
                for r in db_records:
                    services = r.services
                    if isinstance(services, str):
                        try:
                            services = json.loads(services)
                        except Exception:
                            services = [s.strip() for s in services.split(",") if s.strip()]
                    records.append(
                        {
                            "id": r.id,
                            "name": r.name,
                            "facility_type": r.facility_type,
                            "address": r.address,
                            "pincode": r.pincode,
                            "city": r.city,
                            "state": r.state,
                            "latitude": r.latitude,
                            "longitude": r.longitude,
                            "contact": r.contact,
                            "opening_hours": r.opening_hours,
                            "services": services,
                            "status_label": r.status_label,
                            "is_sample": r.is_sample,
                            "exists_in_directory": r.exists_in_directory,
                            "doctor_availability": r.doctor_availability,
                            "bed_availability": r.bed_availability,
                            "source": r.source,
                            "last_verified_at": r.last_verified_at,
                        }
                    )
                return records
        except Exception as e:
            log.debug("DB query for facilities bypassed or empty: %s", e)

    return load_sample_facilities()


def search_facilities(
    db: Session | None,
    pincode: str | None = None,
    city: str | None = None,
    facility_type: str | None = None,
    search: str | None = None,
) -> FacilityListResponse:
    # Validation
    clean_pincode: str | None = None
    if pincode is not None:
        raw_pin = pincode.strip()
        if raw_pin:
            if not raw_pin.isdigit() or len(raw_pin) != 6:
                raise HTTPException(
                    status_code=422,
                    detail="Please enter a valid 6-digit Indian PIN code (e.g. 201001 or 110001).",
                )
            clean_pincode = raw_pin

    clean_city = city.strip().lower() if city and city.strip() else None
    clean_search = search.strip().lower() if search and search.strip() else None

    clean_type: str | None = None
    if facility_type and facility_type.strip():
        t = facility_type.strip().lower()
        allowed = {"hospital", "phc", "clinic", "emergency", "all"}
        if t not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Facility type must be one of: hospital, phc, clinic, emergency (or all). Received '{facility_type}'",
            )
        if t != "all":
            clean_type = t

    raw_items = get_all_facilities(db)
    filtered: list[FacilityOut] = []

    for item in raw_items:
        # Filter by PIN code
        if clean_pincode and item.get("pincode") != clean_pincode:
            continue

        # Filter by City
        if clean_city:
            fac_city = (item.get("city") or "").lower()
            fac_addr = (item.get("address") or "").lower()
            fac_state = (item.get("state") or "").lower()
            if clean_city not in fac_city and clean_city not in fac_addr and clean_city not in fac_state:
                continue

        # Filter by Facility Type
        if clean_type:
            fac_type = (item.get("facility_type") or "").lower()
            if fac_type != clean_type:
                continue

        # Filter by General Search Query
        if clean_search:
            fac_name = (item.get("name") or "").lower()
            fac_addr = (item.get("address") or "").lower()
            fac_services = " ".join(item.get("services") or []).lower()
            if (
                clean_search not in fac_name
                and clean_search not in fac_addr
                and clean_search not in fac_services
            ):
                continue

        filtered.append(FacilityOut.from_record(item))

    # Construct descriptive user-friendly message
    if filtered:
        criteria = []
        if clean_pincode:
            criteria.append(f"PIN {clean_pincode}")
        if clean_city:
            criteria.append(f"city '{city}'")
        if clean_type:
            criteria.append(f"type '{clean_type}'")
        if clean_search:
            criteria.append(f"matching '{search}'")

        if criteria:
            msg = f"Found {len(filtered)} healthcare {'facility' if len(filtered) == 1 else 'facilities'} for {', '.join(criteria)}."
        else:
            msg = f"Showing all {len(filtered)} healthcare facilities. Enter your PIN code or city to find facilities near you."
    else:
        msg = (
            "No healthcare facilities found matching your criteria. "
            "Try searching with sample PINs: 201001 (Ghaziabad), 110001 (New Delhi), 560001 (Bengaluru), 400001 (Mumbai), "
            "or clear the facility type filter."
        )

    return FacilityListResponse(
        items=filtered,
        total=len(filtered),
        message=msg,
        query={
            "pincode": clean_pincode,
            "city": city,
            "facility_type": facility_type,
            "search": search,
        },
    )
