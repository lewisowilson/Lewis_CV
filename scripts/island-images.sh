#!/usr/bin/env bash
# Turn a Gemini island still into the map's 16:9 webp pair.
# Usage: scripts/island-images.sh <still.jpg> <name>   e.g. design-assets/islands/overview.jpg overview
set -euo pipefail
cd "$(dirname "$0")/.."
FF=./node_modules/ffmpeg-static/ffmpeg.exe
src=$1; name=$2; out=public/media/islands
crop="crop='min(iw,ih*16/9)':'min(ih,iw*9/16)'"
"$FF" -v error -y -i "$src" -vf "$crop,scale=2400:-2:flags=lanczos" -c:v libwebp -quality 80 "$out/$name.webp"
"$FF" -v error -y -i "$src" -vf "$crop,scale=960:-2:flags=lanczos" -c:v libwebp -quality 78 "$out/$name-960.webp"
echo "$name: $(ls -l $out/$name.webp $out/$name-960.webp | awk '{print $5}' | tr '\n' ' ')"
