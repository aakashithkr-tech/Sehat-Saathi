from datetime import datetime
from typing import Literal
from urllib.parse import quote_plus

from pydantic import BaseModel, ConfigDict, Field


FacilityType = Literal["hospital", "phc", "clinic", "emergency"]


class FacilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    facility_type: str
    address: str
    pincode: str
    city: str
    state: str
    latitude: float | None = None
    longitude: float | None = None
    contact: str | None = None
    opening_hours: str | None = None
    services: list[str] = Field(default_factory=list)
    status_label: str = "Demo data"
    is_sample: bool = True
    exists_in_directory: bool = True
    doctor_availability: str = "Not verified / Contact directly"
    bed_availability: str = "Not available (Live bed tracking not active)"
    source: str = "DEMO DATA — availability not live-verified"
    last_verified_at: datetime | None = None
    directions_url: str

    @classmethod
    def from_record(cls, data: dict) -> "FacilityOut":
        name = data.get("name", "")
        address = data.get("address", "")
        pincode = data.get("pincode", "")
        city = data.get("city", "")
        lat = data.get("latitude")
        lng = data.get("longitude")

        if lat is not None and lng is not None:
            directions_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
        else:
            q = quote_plus(f"{name}, {address}, {pincode}")
            directions_url = f"https://www.google.com/maps/search/?api=1&query={q}"

        services = data.get("services", [])
        if isinstance(services, str):
            import json
            try:
                services = json.loads(services)
            except Exception:
                services = [s.strip() for s in services.split(",") if s.strip()]

        return cls(
            id=str(data.get("id")),
            name=name,
            facility_type=str(data.get("facility_type", "hospital")).lower(),
            address=address,
            pincode=str(pincode),
            city=city,
            state=data.get("state", ""),
            latitude=lat,
            longitude=lng,
            contact=data.get("contact"),
            opening_hours=data.get("opening_hours"),
            services=services,
            status_label=data.get("status_label", "Demo data"),
            is_sample=bool(data.get("is_sample", True)),
            exists_in_directory=bool(data.get("exists_in_directory", True)),
            doctor_availability=data.get("doctor_availability") or "Not verified / Contact directly",
            bed_availability=data.get("bed_availability") or "Not available (Live bed tracking not active)",
            source=data.get("source") or "DEMO DATA — availability not live-verified",
            last_verified_at=data.get("last_verified_at"),
            directions_url=directions_url,
        )


class FacilityListResponse(BaseModel):
    items: list[FacilityOut]
    total: int
    message: str
    query: dict[str, str | None] = Field(default_factory=dict)
