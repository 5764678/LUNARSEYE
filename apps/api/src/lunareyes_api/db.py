"""Site registry storage (Postgres, SQLAlchemy 2).

Phase 1: the schema is created with ``create_all`` and the cited catalogue is seeded
idempotently at start-up. Alembic migrations (0001 schema, 0002 seed) replace this in
Phase 2; the table already has the target columns and CHECK constraints.
"""

from __future__ import annotations

import os
import uuid
from collections import Counter
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, Float, String, Text, create_engine, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from lunareyes_data.catalogs.sites import SiteCatalog, load_site_catalog

DEFAULT_DATABASE_URL = "postgresql+psycopg://lunareyes:lunareyes@localhost:5432/lunareyes"
CATALOG_NAMESPACE = uuid.UUID("6f1d3c0a-7a53-5b0e-9a55-2f2b5c1d7e10")


def catalog_site_uuid(catalog_site_id: str) -> uuid.UUID:
    """Deterministic registry id of a catalogue site, stable across databases."""
    return uuid.uuid5(CATALOG_NAMESPACE, catalog_site_id)


class Base(DeclarativeBase):
    pass


class Site(Base):
    __tablename__ = "sites"
    __table_args__ = (
        CheckConstraint("lat_deg >= -90 AND lat_deg <= 90", name="sites_lat_range"),
        CheckConstraint("lon_deg >= 0 AND lon_deg < 360", name="sites_lon_range"),
        CheckConstraint("frame = 'MOON_ME'", name="sites_frame"),
        CheckConstraint("origin IN ('catalog', 'user')", name="sites_origin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80))
    name_key: Mapped[str] = mapped_column(String(80), unique=True)
    lat_deg: Mapped[float] = mapped_column(Float)
    lon_deg: Mapped[float] = mapped_column(Float)
    frame: Mapped[str] = mapped_column(String(16), default="MOON_ME")
    origin: Mapped[str] = mapped_column(String(16))
    reference: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


def name_key(name: str) -> str:
    return " ".join(name.split()).casefold()


def make_engine(url: str | None = None) -> Engine:
    return create_engine(
        url or os.environ.get("LUNAREYES_DATABASE_URL", DEFAULT_DATABASE_URL), pool_pre_ping=True
    )


def init_db(engine: Engine, catalog: SiteCatalog | None = None) -> None:
    """Create the schema and seed the cited catalogue (idempotent)."""
    Base.metadata.create_all(engine)
    catalog = catalog or load_site_catalog()
    counts = Counter(name_key(s.name) for s in catalog.sites)
    # PGDA labels two tiles "de Gerlache rim"; registry names are unique, so a repeated
    # name carries its PGDA tile id.
    names = {
        s.id: s.name if counts[name_key(s.name)] == 1 else f"{s.name} ({s.pgda_site_id})"
        for s in catalog.sites
    }
    rows = [
        {
            "id": catalog_site_uuid(s.id),
            "name": names[s.id],
            "name_key": name_key(names[s.id]),
            "lat_deg": s.reference_point.latitude_deg,
            "lon_deg": s.reference_point.longitude_deg,
            "frame": "MOON_ME",
            "origin": "catalog",
            "reference": f"{catalog.citation}; tile {s.pgda_site_id}",
            "notes": f"catalog_id={s.id}",
            "created_at": datetime.now(UTC),
        }
        for s in catalog.sites
    ]
    with engine.begin() as connection:
        connection.execute(pg_insert(Site).values(rows).on_conflict_do_nothing(index_elements=["id"]))


def list_sites(engine: Engine) -> list[Site]:
    with Session(engine) as session:
        return list(session.scalars(select(Site).order_by(Site.name)))


def get_site(engine: Engine, site_id: uuid.UUID) -> Site | None:
    with Session(engine) as session:
        return session.get(Site, site_id)
