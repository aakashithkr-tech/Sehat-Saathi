import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
from .contact import utcnow


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), index=True)
    facility_type: Mapped[str] = mapped_column(String(50), index=True)  # hospital | phc | clinic | emergency
    address: Mapped[str] = mapped_column(String(400))
    pincode: Mapped[str] = mapped_column(String(10), index=True)
    city: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    contact: Mapped[str | None] = mapped_column(String(200), nullable=True)
    opening_hours: Mapped[str | None] = mapped_column(String(200), nullable=True)
    services: Mapped[str] = mapped_column(Text, default="[]")  # JSON encoded list of services
    status_label: Mapped[str] = mapped_column(String(50), default="Demo data")
    is_sample: Mapped[bool] = mapped_column(Boolean, default=True)
    exists_in_directory: Mapped[bool] = mapped_column(Boolean, default=True)
    doctor_availability: Mapped[str | None] = mapped_column(String(300), nullable=True)
    bed_availability: Mapped[str | None] = mapped_column(String(300), nullable=True)
    source: Mapped[str] = mapped_column(String(300), default="DEMO DATA — availability not live-verified")
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_facilities_pincode_type", "pincode", "facility_type"),
        Index("ix_facilities_city_type", "city", "facility_type"),
    )
