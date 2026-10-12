"""Vultr public plans API (no auth), cloud GPU plans. Price is per plan, USD/hour.

Fractional vGPU plans (gpu_count like "1/8") are skipped. `gpu_vram_gb` is the plan total.
"""

from scraper import http
from scraper.schema import Offer, canonical_model

URL = "https://api.vultr.com/v2/plans"


def parse(payload: dict) -> list[Offer]:
    offers = []
    for p in payload["plans"]:
        count = p.get("gpu_count")
        if not isinstance(count, int) or count < 1 or not p.get("hourly_cost"):
            continue
        vram = p["gpu_vram_gb"] / count
        model = canonical_model(p["gpu_type"], vram)
        offers.append(Offer(
            provider="vultr",
            instance_type=p["id"],
            gpu_model=model,
            gpu_count=count,
            price_per_gpu_hour_usd=round(p["hourly_cost"] / count, 4),
            instance_price_usd_per_hour=p["hourly_cost"],
            vram_gb=vram,
            vcpus=p["vcpu_count"],
            system_ram_gb=p["ram"] / 1024,
            local_storage_tb=round(p["disk"] / 1000, 3),
            deploy_url="https://www.vultr.com/products/cloud-gpu/",
            source="vultr-api",
        ))
    return offers


def fetch(raw) -> list[Offer]:
    resp = http.get(URL, params={"type": "vcg", "per_page": 500})
    raw("vultr.json", resp.content)
    return parse(resp.json())
