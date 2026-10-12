"""Akamai/Linode public types API (no auth). Price is per instance, USD/hour."""

import re

from scraper import http
from scraper.schema import Offer, canonical_model, default_vram

URL = "https://api.linode.com/v4/linode/types"


def _model(label: str) -> str:
    m = re.search(r"(RTX\s?\d+(?:\s?Ada)?)", label)
    return canonical_model(m.group(1)) if m else label


def parse(payload: dict) -> list[Offer]:
    offers = []
    for t in payload["data"]:
        count = t.get("gpus") or 0
        price = t["price"]["hourly"]
        if t["class"] != "gpu" or count < 1 or not price:
            continue
        model = _model(t["label"])
        offers.append(Offer(
            provider="linode",
            instance_type=t["id"],
            gpu_model=model,
            gpu_count=count,
            price_per_gpu_hour_usd=round(price / count, 4),
            instance_price_usd_per_hour=price,
            vram_gb=default_vram(model),
            vcpus=t["vcpus"],
            system_ram_gb=t["memory"] / 1024,
            local_storage_tb=round(t["disk"] / 1024 / 1024, 3),
            deploy_url="https://www.linode.com/products/gpu/",
            source="linode-api",
        ))
    return offers


def fetch(raw) -> list[Offer]:
    resp = http.get(URL, params={"page_size": 500})
    raw("linode.json", resp.content)
    return parse(resp.json())
