#!/usr/bin/env bash
# Turn a Gemini sky-variant flight into hero scrub frames + posters.
# Usage: scripts/sky-frames.sh <video.mp4> <first-still.jpg> <name>   e.g. ... V4-night-flight.mp4 11-night-start.jpg hero-night
set -euo pipefail
cd "$(dirname "$0")/.."
FF=./node_modules/ffmpeg-static/ffmpeg.exe
src=$1; still=$2; name=$3
for size in 1280:d 768:m; do
  w=${size%:*}; t=${size#*:}; out=public/media/$name/$t
  mkdir -p "$out"; rm -f "$out"/*.webp
  "$FF" -v error -i "$src" -an -vf "fps=12,scale=$w:-2:flags=lanczos" -c:v libwebp -quality 78 -compression_level 6 "$out/f%03d.webp"
  echo "$name $t: $(ls "$out" | wc -l) frames, $(du -sh "$out" | cut -f1)"
done
"$FF" -v error -y -i "$still" -vf "scale=1920:-2:flags=lanczos" -c:v libwebp -quality 80 "public/media/posters/$name.webp"
"$FF" -v error -y -i "$still" -vf "scale=960:-2:flags=lanczos" -c:v libwebp -quality 80 "public/media/posters/$name-960.webp"
echo "posters: $(ls -l public/media/posters/$name*.webp | awk '{print $5}' | tr '\n' ' ')"
