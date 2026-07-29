#!/usr/bin/env python3
"""
Reusable pipeline: search free stock-photo APIs for a component, download
the best match, strip its background locally (rembg — no API, no cost),
and record a manifest entry with full provenance/license info.

Dev-time tool only — not part of the shipped app. Requires a Python
virtualenv with the packages in requirements.txt (rembg needs a real
onnxruntime backend; see README.md for the exact install commands this
environment needed).

Currently wired to Pexels only. UNSPLASH_ACCESS_KEY and PIXABAY_API_KEY
are read from apps/api/.env the same way PEXELS_API_KEY is, so adding
those sources later is a matter of implementing search_unsplash()/
search_pixabay() alongside search_pexels() below — deliberately not
built until a key actually exists to test against, so this stays "no
guessing at an untestable integration."
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from rembg import remove

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / "apps" / "api" / ".env"
ORIGINALS_DIR = Path(__file__).resolve().parent / "originals"
PROCESSED_DIR = REPO_ROOT / "apps" / "web" / "public" / "images" / "components"
MANIFEST_PATH = Path(__file__).resolve().parent / "manifest.json"

PEXELS_LICENSE_NOTE = (
    "Pexels License (https://www.pexels.com/license/) — every photo on Pexels "
    "is covered by this one platform-wide license, not a per-photo field: free "
    "for commercial and noncommercial use, no attribution required, modification "
    "permitted. Not permitted: reselling/redistributing an unmodified copy as "
    "stock photography, or implying endorsement by the people/brands in a photo."
)


def load_env() -> None:
    """Minimal .env loader — avoids adding python-dotenv as a dependency
    for a two-line need."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


@dataclass
class Candidate:
    source: str
    photo_id: str
    photo_page_url: str
    image_url: str
    width: int
    height: int
    photographer: str
    photographer_url: str
    license_note: str


def search_pexels(query: str, per_page: int = 5) -> list[Candidate]:
    api_key = os.environ.get("PEXELS_API_KEY")
    if not api_key:
        raise RuntimeError("PEXELS_API_KEY is not set in apps/api/.env")
    resp = requests.get(
        "https://api.pexels.com/v1/search",
        params={"query": query, "per_page": per_page},
        headers={"Authorization": api_key},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    return [
        Candidate(
            source="pexels",
            photo_id=str(p["id"]),
            photo_page_url=p["url"],
            image_url=p["src"]["large"],
            width=p["width"],
            height=p["height"],
            photographer=p["photographer"],
            photographer_url=p["photographer_url"],
            license_note=PEXELS_LICENSE_NOTE,
        )
        for p in data.get("photos", [])
    ]


def search_unsplash(query: str, per_page: int = 5) -> list[Candidate]:
    raise NotImplementedError(
        "UNSPLASH_ACCESS_KEY not present in apps/api/.env yet — not implemented "
        "against an untestable integration. Add the key, then implement this "
        "the same shape as search_pexels()."
    )


def search_pixabay(query: str, per_page: int = 5) -> list[Candidate]:
    raise NotImplementedError(
        "PIXABAY_API_KEY not present in apps/api/.env yet — not implemented "
        "against an untestable integration. Add the key, then implement this "
        "the same shape as search_pexels()."
    )


def download(url: str, dest: Path) -> None:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)


def remove_background(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    output = remove(src.read_bytes())
    dest.write_bytes(output)


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text())
    return {"components": []}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")


def fetch_component_image(
    component_id: str,
    query: str,
    chosen: Candidate,
    calibration_notes: str,
) -> dict:
    """Downloads `chosen`, removes its background, and returns the
    manifest entry — the caller picks `chosen` from search results (this
    pilot did that by hand, having actually looked at the candidates;
    see README.md on why fully-automated selection isn't trustworthy yet)."""
    original_path = ORIGINALS_DIR / f"{component_id}.jpg"
    processed_path = PROCESSED_DIR / f"{component_id}.png"

    download(chosen.image_url, original_path)
    remove_background(original_path, processed_path)

    return {
        "componentId": component_id,
        "searchQuery": query,
        "source": chosen.source,
        "photoId": chosen.photo_id,
        "photoPageUrl": chosen.photo_page_url,
        "originalImageUrl": chosen.image_url,
        "photographer": chosen.photographer,
        "photographerUrl": chosen.photographer_url,
        "license": chosen.license_note,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "originalWidthPx": chosen.width,
        "originalHeightPx": chosen.height,
        "processedFile": str(processed_path.relative_to(REPO_ROOT)),
        "backgroundRemoved": True,
        "calibrationNotes": calibration_notes,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", help="Search query to run against Pexels")
    parser.add_argument("--per-page", type=int, default=5)
    args = parser.parse_args()

    load_env()
    for c in search_pexels(args.query, args.per_page):
        print(f"{c.photo_id}\t{c.width}x{c.height}\t{c.photographer}\t{c.photo_page_url}")


if __name__ == "__main__":
    main()
