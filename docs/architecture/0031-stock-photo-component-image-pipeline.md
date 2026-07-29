# ADR 0031: Stock-photo + local background-removal pipeline for component imagery (P2-4 pilot v2)

- **Date:** 2026-07-29
- **Status:** Accepted for the pipeline mechanics; pilot output quality is
  mixed — see Consequences. Stopped after this pilot batch per standing
  instruction, awaiting review before running against the full ~157-180
  component list.

## Context

The original P2-4 plan (AI image generation) was tried twice and failed
both times, for different real reasons:

1. **Gemini (`gemini-2.5-flash-image`)** — the API key authenticated
   correctly, but the associated project has `limit: 0` free-tier quota
   for this specific image model (a real Google billing/quota state, not
   a bad key) — confirmed via one real test call, exact error reported,
   not used further.
2. **Pollinations.ai (free, keyless)** — connection worked, no watermark,
   but the only image model this free tier offers (`sana`) structurally
   cannot render precise repeated-grid geometry (confirmed with a
   maximally simple "10×10 grid of dots" diagnostic — still came back
   irregular) and repeatedly produced wrong-anatomy results for small
   specific components (a resistor came out shaped like a drink can; an
   LED came out shaped like a decorative beacon, then an incandescent
   bulb) — a hard model limitation, not a prompting problem.

This ADR covers the replacement approach: **real stock photos + local
background removal**, not generation.

## Decision

### 1. Pexels only, for now — Unsplash/Pixabay stubbed, not faked

`PEXELS_API_KEY` is the only one of the three keys actually present in
`apps/api/.env`. `scripts/component-images/fetch_component_image.py`
implements `search_pexels()` for real and leaves `search_unsplash()`/
`search_pixabay()` raising `NotImplementedError` with a clear message,
rather than writing untestable integration code against keys that don't
exist yet. Once a key is added, implementing the matching function is
the only work needed — the `Candidate`/manifest shape is already
source-agnostic.

### 2. License handling: Pexels is one platform-wide license, not per-photo

Checked rather than assumed: Pexels' API doesn't return a per-photo
license field because every photo on the platform is covered by the same
[Pexels License](https://www.pexels.com/license/) — free for commercial
and noncommercial use, no attribution required, modification permitted;
the only real restrictions are reselling an unmodified copy as stock
photography, or implying endorsement. The manifest records this exact
license text per entry rather than inventing a per-photo field Pexels
doesn't have.

### 3. `rembg` for background removal — a real native-dependency fight, resolved

`rembg` needs `onnxruntime` and (transitively, via `numba`) `llvmlite`, a
compiled-from-source dependency with no prebuilt wheel for whatever
`llvmlite` version pip resolves by default on this machine (macOS
x86_64). Two things made it installable:

- **A dedicated Python 3.12 virtualenv**, not the system Python (3.14 —
  too new; no `llvmlite` wheel exists for it either, confirmed by trying
  first). Never installed anything into system Python (`externally-
managed-environment`, correctly refused by pip without an explicit
  override this ADR didn't need to reach for).
- **`pip install --only-binary=:all:`**, forcing pip to reject the
  newest `llvmlite` (no wheel available) and fall back to an older
  release (0.45.1) that does ship one — rather than trying to compile
  LLVM bindings from source, a slow, fragile path this pass avoided
  entirely once the wheel-only flag found a working alternative.

`requirements.txt`/`README.md` in `scripts/component-images/` capture
the exact versions and setup steps so this doesn't need re-discovering.

### 4. Manifest as the audit trail, one entry per component regardless of outcome

`scripts/component-images/manifest.json` records every attempted
component — including the two that were **skipped**, with the exact
reason — not just the successes. Each entry: search query, source,
photo id/page URL, photographer, the full license text, fetch timestamp,
original dimensions, the processed file path, and free-form calibration
notes. This is the thing to check if a licensing question ever comes up,
and it should stay accurate for every future component this pipeline
touches, success or not.

## Pilot results — mixed, reported honestly rather than polished

| Component       | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resistor (220Ω) | **Found a real axial resistor photo, but not usable as-is, two separate problems**: (a) the specific resistor photographed is 4700Ω (yellow-violet-red-gold bands), not 220Ω — stock photography can't be commissioned to show an exact value; (b) `rembg` picked the wrong salient object — the original photo has a wire-stripper tool in sharp focus in front of the (slightly out-of-focus) resistor, and the background-removal model kept the sharp tool, erasing most of the actual resistor. |
| Power supply    | **Usable.** Clean, isolated, correctly-cropped small wall-adapter photo; background removal worked cleanly.                                                                                                                                                                                                                                                                                                                                                                                          |
| Breadboard      | **Skipped.** Reviewed ~8 real candidates across 3 query variations; every genuinely _empty_ breadboard photo found was shot at an angle, in shrink-wrap packaging, with plastic glare over part of the grid — not usable for pixel-accurate hole calibration. The one _unobstructed, flat_ breadboard photo found had a whole populated circuit already plugged into it.                                                                                                                             |
| LED (red, off)  | **Skipped — not found at all.** Four query variations returned car tail lights, neon signs, traffic lights, and household screw-base bulbs, never once an actual 5mm through-hole LED. Looks like a genuine coverage gap in this specific free library for this specific niche part, not a search-tuning problem.                                                                                                                                                                                    |

**What this proves:** the pipeline mechanics work correctly end-to-end —
search, license-aware selection, download, local background removal, and
a real audit-trail manifest. **What this doesn't yet prove:** that this
specific free source (Pexels) has adequate coverage for small, specific
electronic components at the ~157-180-component scale this needs to
reach, or that automated background removal is safe to run unattended on
arbitrary stock photos without a human checking for the
wrong-salient-object failure mode found here.

## Alternatives considered

- **Keep iterating on search queries for the breadboard/LED** — stopped
  after a genuine, multi-query effort per the standing "log what
  happened, skip, move on" instruction, rather than searching
  indefinitely for something that may not exist in this library.
- **Auto-crop before background removal to fix the resistor's
  wrong-salient-object problem** — not attempted this pass; a real,
  addressable idea for a follow-up (e.g., asking Pexels for a tighter/
  more zoomed source image, or a manual bounding-box crop step before
  `rembg` runs) but adds scope beyond "prove the pipeline once," which
  is what this pilot asked for.

## Consequences

- Two usable-or-near-usable images exist: `power-supply.png` (ready),
  `resistor-220ohm.png` (real resistor anatomy, wrong value, background-
  removal artifact — needs either a different source photo or a manual
  crop-then-rembg pass before use).
- Two components have zero sourced image and a documented reason why.
- Before running this against the full component list, the real open
  questions are: (a) whether Unsplash/Pixabay (once keyed) cover the
  gaps Pexels has for niche parts, (b) whether a pre-crop step before
  `rembg` is needed as standard practice rather than an occasional fix,
  and (c) whether hand-review-per-component (as this pilot did) is
  sustainable at ~157-180 components or whether a cheaper approval
  workflow is needed.
