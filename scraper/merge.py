#!/usr/bin/env python3
"""Merge per-job result files into all.json, all.csv and meta.json.

Usage (from repo root):
  python -m scraper.merge --data-dir data
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

CSV_FIELDS = [
    "provider", "gpu_model", "gpu_count", "price_per_gpu_hour_usd", "instance_price_usd_per_hour",
    "instance_type", "region", "region_count", "vram_gb", "vcpus", "system_ram_gb",
    "local_storage_tb", "pricing", "currency", "source", "deploy_url",
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="data")
    args = ap.parse_args()

    data_dir = Path(args.data_dir)
    job_files = sorted((data_dir / "jobs").glob("*.json"))
    if not job_files:
        raise SystemExit(f"No job files in {data_dir / 'jobs'}")

    rows, jobs = [], []
    for path in job_files:
        job = json.loads(path.read_text(encoding="utf-8"))
        rows.extend(job["rows"])
        jobs.append({
            "job": job["job"],
            "rows": len(job["rows"]),
            "stale": job["stale"],
            "last_success": job["last_success"],
            "error": job["error"],
        })

    rows.sort(key=lambda r: (r["provider"], r["gpu_model"], r["price_per_gpu_hour_usd"]))

    (data_dir / "all.json").write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
    with (data_dir / "all.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    meta = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rows": len(rows),
        "providers": sorted({r["provider"] for r in rows}),
        "stale_jobs": [j["job"] for j in jobs if j["stale"]],
        "jobs": jobs,
    }
    (data_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Merged {len(rows)} rows from {len(jobs)} jobs ({len(meta['stale_jobs'])} stale)")


if __name__ == "__main__":
    main()
