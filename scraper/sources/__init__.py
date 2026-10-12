"""Price sources. Each module exposes `fetch(raw) -> list[Offer]`.

`raw(name, data)` saves the unmodified upstream response so failures can be diagnosed.
"""
