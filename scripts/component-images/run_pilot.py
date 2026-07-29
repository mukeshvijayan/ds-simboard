#!/usr/bin/env python3
"""One-off driver for the P2-4 pilot batch — hand-picked candidates
after visually reviewing search results (see docs/architecture/0031-*.md).
Not the long-term interface; a future pass can build real automated
selection once there's a clearer signal for what "best match" means."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_component_image import (  # noqa: E402
    Candidate,
    PEXELS_LICENSE_NOTE,
    fetch_component_image,
    load_env,
    load_manifest,
    save_manifest,
)

load_env()

PILOT = [
    (
        "resistor-220ohm",
        "resistor electronic component",
        Candidate(
            source="pexels",
            photo_id="6586771",
            photo_page_url="https://www.pexels.com/photo/resistor-and-steel-wire-6586771/",
            image_url="https://images.pexels.com/photos/6586771/pexels-photo-6586771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            width=6000,
            height=4000,
            photographer="Zacharias Korsalka",
            photographer_url="https://www.pexels.com/@zacharias-korsalka-1546303",
            license_note=PEXELS_LICENSE_NOTE,
        ),
        (
            "Real axial resistor, both leads clearly visible. IMPORTANT MISMATCH: "
            "this specific resistor's bands are yellow-violet-red-gold = 4700 ohm, "
            "not the 220 ohm (red-red-brown-gold) the pilot needed — stock photography "
            "can't be commissioned to show an exact value on demand. Proves the "
            "pipeline finds real, correctly-anatomied resistor photos; does not "
            "prove a 220 ohm-specific photo is sourceable from this library."
        ),
    ),
    (
        "power-supply",
        "power adapter charger white background",
        Candidate(
            source="pexels",
            photo_id="3921700",
            photo_page_url="https://www.pexels.com/photo/white-adapter-on-white-surface-3921700/",
            image_url="https://images.pexels.com/photos/3921700/pexels-photo-3921700.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            width=2832,
            height=4240,
            photographer="ready made",
            photographer_url="https://www.pexels.com/@readymade",
            license_note=PEXELS_LICENSE_NOTE,
        ),
        "Single isolated wall-adapter object, plain light surface. No leads/holes to calibrate.",
    ),
]

manifest = load_manifest()
existing_ids = {c["componentId"] for c in manifest["components"]}

for component_id, query, candidate, calibration_notes in PILOT:
    print(f"fetching {component_id}...")
    entry = fetch_component_image(component_id, query, candidate, calibration_notes)
    manifest["components"] = [
        c for c in manifest["components"] if c["componentId"] != component_id
    ]
    manifest["components"].append(entry)
    print(f"  -> {entry['processedFile']}")

save_manifest(manifest)
print("done")
