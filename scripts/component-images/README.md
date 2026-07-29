# Component image pipeline

Dev-time tool only — not part of the shipped app, not run by any build or
deploy step. Searches free stock-photo APIs for a real component photo,
downloads it, strips its background locally (`rembg`, no API/cost), and
records provenance in `manifest.json`. See `docs/architecture/0031-*.md`
for the design/pilot decision this came out of.

## Setup

Needs its own Python virtualenv — the host machine's system Python may be
a version too new for `llvmlite` (a `rembg` dependency) to have a
prebuilt wheel yet; a slightly older interpreter (3.12 here) does:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
pip install --only-binary=:all: -r requirements.txt
```

`--only-binary=:all:` matters: without it, pip may resolve the newest
`llvmlite`, which can lack a prebuilt wheel for your platform and try
(and fail) to compile from source. Forcing wheels-only makes pip fall
back to an older `llvmlite` release that does ship one.

First run downloads `rembg`'s background-removal model (~176MB, one
time, cached under `~/.u2net/`).

## Credentials

Reads `PEXELS_API_KEY` (and, once added, `UNSPLASH_ACCESS_KEY`/
`PIXABAY_API_KEY`) from `apps/api/.env` — the same file the API server
itself uses, so there's only one place secrets live. Never commit real
values there; `apps/api/.env.example` documents the variable names with
empty placeholders.

## Usage

```sh
python3 fetch_component_image.py "resistor electronic component"
```

Prints candidate photos (id, size, photographer, page URL) for manual
review — this pilot batch was selected by hand after actually looking at
each candidate (see the ADR for why fully-automated selection isn't
trustworthy yet: search results include plenty of irrelevant matches —
populated circuit boards, household light bulbs, food photos for
"breadboard" — that no simple heuristic reliably filters out).
