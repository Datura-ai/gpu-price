"""HTTP helper with retries and a descriptive user agent."""

from __future__ import annotations

import time

import requests

USER_AGENT = "gpu-price-tracker (+https://gpuprice.becloudready.com)"


def get(url: str, *, params: dict | None = None, headers: dict | None = None, timeout: int = 60, retries: int = 3) -> requests.Response:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, headers={"User-Agent": USER_AGENT, **(headers or {})}, timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            last = e
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GET {url} failed after {retries} attempts: {last}") from last
