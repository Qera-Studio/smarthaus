#!/usr/bin/env bash
#
# Hero cursor grid: Blender PNG frames -> cropped WebP with alpha.
#
#   scripts/hero-grid.sh            # public/hero/hero_grid/*.png -> public/hero/grid/*.webp
#
# The source frames are 2112x1320 with a transparent sky and an opaque ground
# plane filling the whole lower half. The site only ever shows a band of that:
# from just above the roofline to just below the villa's foot in the most
# elevated row, plus the strip the bottom edge blurs across. Cropping here
# rather than in CSS cuts the bytes to 41% and makes the stylesheet's "blur
# from 90%" a plain percentage of the image rather than a number derived from
# where the foot lands inside a taller frame.
#
# The crop is a single rectangle applied to every frame, so the villa's shift
# between rows — the parallax the grid exists for — survives untouched.
#
# Measured (see the villa/foot extents in the session that wrote this):
#   roof top        y = 337..355  across all 45 frames
#   villa foot      y = 695..758  (row 4 rests at 696, row 0 lifts to 758)
#   palm bases      y = ..796     in row 0
# Crop rows 296..840: 42px above the highest roof, foot at 73% (row 4) to 85%
# (row 0), so it stays sharp in every frame; the last 10% (786..840) is what the
# bottom edge dissolves across.
#
# cwebp rather than Sharp: it is what this machine has, and the whole pipeline
# is one flag set. Re-run after any re-render; the output is committed.

set -euo pipefail

cd "$(dirname "$0")/.."

SRC=public/hero/hero_grid
OUT=public/hero/grid
CROP="0 296 2112 544"

mkdir -p "$OUT"

ls "$SRC"/r*_c*.png | xargs -P 8 -I{} sh -c '
  f="{}"; b="$(basename "${f%.png}")"
  cwebp -quiet -q 82 -alpha_q 100 -m 6 -crop '"$CROP"' "$f" -o "'"$OUT"'/$b.webp"
'

du -sh "$OUT"
ls "$OUT" | wc -l
