"""dstack gpuhunt public catalog (S3). Undocumented but stable; one catalog per provider.

Prices are per instance in USD/hour. Spot rows and non-GPU rows are skipped.
"""

import csv
import io
import zipfile

from scraper import http
from scraper.schema import Offer, canonical_model, default_vram, drop_fractional, is_gpu_name

BASE = "https://dstack-gpu-pricing.s3.eu-west-1.amazonaws.com/v3"

# gpuhunt provider id -> our provider slug
PROVIDERS = {
    "aws": "aws",
    "azure": "azure",
    "gcp": "gcp",
    "oci": "oracle",
    "lambdalabs": "lambdalabs",
    "runpod": "runpod",
    "nebius": "nebius",
    "verda": "verda",
    "cloudrift": "cloudrift",
}


def _float(s):
    try:
        return float(s) if s not in ("", None) else None
    except ValueError:
        return None


def parse(provider_id: str, csv_text: str) -> list[Offer]:
    provider = PROVIDERS[provider_id]
    offers = []
    for r in csv.DictReader(io.StringIO(csv_text)):
        count = int(_float(r["gpu_count"]) or 0)
        price = _float(r["price"])
        if count < 1 or not price or r["spot"] == "True" or not is_gpu_name(r["gpu_name"]):
            continue
        vram = _float(r["gpu_memory"])
        model = canonical_model(r["gpu_name"], vram)
        disk_gb = _float(r["disk_size"])
        per_gpu = price / count
        offers.append(Offer(
            provider=provider,
            instance_type=r["instance_name"],
            gpu_model=model,
            gpu_count=count,
            price_per_gpu_hour_usd=round(per_gpu, 4),
            instance_price_usd_per_hour=round(price, 4),
            region=r["location"],
            regions={r["location"]: round(per_gpu, 4)},
            vram_gb=vram or default_vram(model),
            vcpus=_float(r["cpu"]),
            system_ram_gb=_float(r["memory"]),
            local_storage_tb=round(disk_gb / 1000, 3) if disk_gb else None,
            source="gpuhunt",
        ))
    return drop_fractional(offers)


def fetch_provider(provider_id: str, raw) -> list[Offer]:
    version = http.get(f"{BASE}/{provider_id}/version").text.strip()
    blob = http.get(f"{BASE}/{provider_id}/{version}/catalog.zip", timeout=180).content
    raw(f"{provider_id}-{version}.zip", blob)
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        text = z.read(f"{provider_id}.csv").decode("utf-8")
    return parse(provider_id, text)
