"""Normalized offer schema, GPU naming and sanity bounds shared by all sources."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Optional

# Canonical display names, keyed by lowercase alphanumeric-only aliases.
_MODELS = {
    "a10": "A10", "a10g": "A10G", "a16": "A16", "a30": "A30", "a40": "A40",
    "a100": "A100", "a4000": "A4000", "a4500": "A4500", "a5000": "A5000", "a6000": "A6000",
    "b200": "B200", "b300": "B300", "gb200": "GB200", "gb300": "GB300", "gh200": "GH200",
    "h100": "H100", "h100nvl": "H100 NVL", "h200": "H200",
    "l4": "L4", "l40": "L40", "l40s": "L40S",
    "mi300x": "MI300X", "mi350x": "MI350X", "mi355x": "MI355X",
    "p100": "P100", "t4": "T4", "v100": "V100",
    "rtx3070": "RTX 3070", "rtx3080ti": "RTX 3080 Ti", "rtx3090": "RTX 3090",
    "rtx4000": "RTX 4000", "rtx4000ada": "RTX 4000 Ada", "rtx4090": "RTX 4090",
    "rtx5090": "RTX 5090", "rtx6000": "RTX 6000", "rtx6000ada": "RTX 6000 Ada",
    "rtx2000ada": "RTX 2000 Ada", "rtx4070ti": "RTX 4070 Ti", "rtx5000ada": "RTX 5000 Ada",
    "rtxpro4000": "RTX PRO 4000", "rtxpro4500": "RTX PRO 4500", "rtxpro4500se": "RTX PRO 4500 SE",
    "rtxpro5000": "RTX PRO 5000", "rtxpro6000": "RTX PRO 6000", "rtxpro6000wk": "RTX PRO 6000 WK",
}

# VRAM (GB) for models where a source omits it.
_DEFAULT_VRAM = {"RTX 6000": 24, "RTX 4000 Ada": 20}

# Models whose memory size is part of the SKU identity.
_VRAM_VARIANTS = {"A100": (40, 80), "V100": (16, 32)}

# Sanity bounds in USD per GPU-hour. Rows outside are quarantined, not published.
_DEFAULT_BOUNDS = (0.05, 60.0)
_BOUNDS = {
    "H100": (0.5, 20.0),
    "H100 NVL": (0.5, 20.0),
    "H200": (0.8, 25.0),
    "B200": (1.5, 30.0),
    "A100 40GB": (0.2, 10.0),
    "A100 80GB": (0.3, 12.0),
}

_NON_GPU = re.compile(r"^(cpu|v\d+|tpu)", re.I)


@dataclass
class Offer:
    provider: str
    instance_type: str
    gpu_model: str
    gpu_count: int
    price_per_gpu_hour_usd: float
    instance_price_usd_per_hour: float
    region: Optional[str] = None
    regions: dict = field(default_factory=dict)  # region -> USD per GPU-hour
    vram_gb: Optional[float] = None
    vcpus: Optional[float] = None
    system_ram_gb: Optional[float] = None
    local_storage_tb: Optional[float] = None
    deploy_url: Optional[str] = None
    source: str = ""
    # "in_stock" | "out_of_stock" | None (unknown). Only some sources publish stock.
    availability: Optional[str] = None
    currency: str = "USD"
    pricing: str = "on_demand"

    def to_dict(self) -> dict:
        d = asdict(self)
        d["region_count"] = len(self.regions)
        return d


def is_gpu_name(raw: str) -> bool:
    raw = (raw or "").strip()
    return bool(raw) and not _NON_GPU.match(raw)


def canonical_model(raw: str, vram_gb: Optional[float] = None) -> str:
    key = re.sub(r"[^a-z0-9]", "", re.sub(r"^nvidia|^amd|^geforce", "", (raw or "").lower().replace("_", "")))
    # Shadeform style "A100_80G": strip the memory suffix, it is re-derived below.
    m = re.fullmatch(r"(a100|v100)(\d+)g", key)
    if m:
        key, vram_gb = m.group(1), vram_gb or float(m.group(2))
    name = _MODELS.get(key, (raw or "").strip())
    variants = _VRAM_VARIANTS.get(name)
    if variants and vram_gb:
        closest = min(variants, key=lambda v: abs(v - vram_gb))
        name = f"{name} {closest}GB"
    return name


def default_vram(model: str) -> Optional[float]:
    return _DEFAULT_VRAM.get(model)


def in_bounds(model: str, price_per_gpu_hour: float) -> bool:
    lo, hi = _BOUNDS.get(model, _DEFAULT_BOUNDS)
    return lo <= price_per_gpu_hour <= hi


def drop_fractional(offers: list[Offer]) -> list[Offer]:
    """Drop vGPU slices: rows whose per-GPU VRAM is well below the largest seen for the
    same provider and model (e.g. Azure NV6ads A10 exposes 4 GB of a 24 GB A10)."""
    best: dict = {}
    for o in offers:
        if o.vram_gb:
            k = (o.provider, o.gpu_model)
            best[k] = max(best.get(k, 0), o.vram_gb)
    return [o for o in offers if not o.vram_gb or o.vram_gb >= 0.9 * best[(o.provider, o.gpu_model)]]


def collapse_regions(offers: list[Offer]) -> list[Offer]:
    """Merge identical SKUs sold in several regions into one row at the cheapest region,
    keeping every region's per-GPU price in `regions`."""
    groups: dict = {}
    for o in offers:
        groups.setdefault((o.provider, o.instance_type, o.gpu_model, o.gpu_count), []).append(o)
    out = []
    for rows in groups.values():
        best = min(rows, key=lambda r: r.price_per_gpu_hour_usd)
        regions = {}
        for r in rows:
            for reg, p in (r.regions or {r.region: r.price_per_gpu_hour_usd}).items():
                if reg:
                    regions[reg] = min(p, regions.get(reg, p))
        best.regions = dict(sorted(regions.items()))
        states = {r.availability for r in rows}
        best.availability = "in_stock" if "in_stock" in states else "out_of_stock" if "out_of_stock" in states else None
        out.append(best)
    return out
