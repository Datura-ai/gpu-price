"""Shadeform marketplace: one unauthenticated call returns offers from many neoclouds.

`hourly_price` is in cents for the whole instance. Providers already collected from a
primary source are skipped so each provider has exactly one source.

Out-of-stock offers are kept (availability="out_of_stock") so every listed provider shows
up. An in-stock offer is priced from its in-stock regions only, so the price is rentable.
"""

import json

from scraper import http
from scraper.schema import Offer, canonical_model, default_vram, drop_fractional, is_gpu_name
from scraper.sources.gpuhunt import PROVIDERS as GPUHUNT_PROVIDERS

URL = "https://api.shadeform.ai/v1/instances/types"

_COVERED = set(GPUHUNT_PROVIDERS.values())


def parse(payload: dict) -> list[Offer]:
    offers = []
    for t in payload.get("instance_types", []):
        provider = t["cloud"]
        cfg = t.get("configuration") or t
        count = int(cfg.get("num_gpus") or 0)
        price_cents = t.get("hourly_price")
        if provider in _COVERED or count < 1 or not price_cents or not is_gpu_name(cfg.get("gpu_type")):
            continue
        vram = cfg.get("vram_per_gpu_in_gb")
        model = canonical_model(cfg["gpu_type"], vram)
        price = price_cents / 100
        slots = t.get("availability") or []
        in_stock = [a["region"] for a in slots if a.get("available")]
        regions = {r: round(price / count, 4) for r in (in_stock or [a["region"] for a in slots])}
        if not regions:
            continue
        storage_gb = cfg.get("storage_in_gb")
        offers.append(Offer(
            provider=provider,
            instance_type=t["shade_instance_type"],
            gpu_model=model,
            gpu_count=count,
            price_per_gpu_hour_usd=round(price / count, 4),
            instance_price_usd_per_hour=round(price, 2),
            region=min(regions, key=regions.get),
            regions=regions,
            vram_gb=vram or default_vram(model),
            vcpus=cfg.get("vcpus"),
            system_ram_gb=cfg.get("memory_in_gb"),
            local_storage_tb=round(storage_gb / 1000, 3) if storage_gb else None,
            deploy_url="https://platform.shadeform.ai/",
            source="shadeform",
            availability="in_stock" if in_stock else "out_of_stock",
        ))
    return drop_fractional(offers)


def fetch(raw) -> list[Offer]:
    resp = http.get(URL)
    raw("shadeform.json", resp.content)
    return parse(resp.json())
