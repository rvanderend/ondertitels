#!/usr/bin/env bash
# Haalt het Engelse tekstondertitelspoor uit een MKV en schrijft het als SRT.
#
#   tools/extract.sh <film.mkv> <doel.srt>
#
# Exitcodes: 0 = gelukt, 2 = heeft al Nederlands (spoor of .nl.srt), 3 = geen
# bruikbaar Engels tekstspoor (bijv. alleen PGS-beeldondertitels).
set -euo pipefail

mkv="$1"
out="$2"

if [[ -e "${mkv%.*}.nl.srt" ]]; then
  echo "Overgeslagen: ${mkv%.*}.nl.srt bestaat al" >&2
  exit 2
fi

# index,codec,taal,forced per ondertitelspoor
tracks=$(ffprobe -v error -select_streams s \
  -show_entries stream=index,codec_name:stream_tags=language:stream_disposition=forced \
  -of csv=p=0 "$mkv")

if grep -Eq ',(dut|nld|nl)(,|$)' <<<"$tracks"; then
  echo "Overgeslagen: bevat al een Nederlands ondertitelspoor" >&2
  exit 2
fi

text_codecs='subrip|ass|ssa|mov_text|webvtt|text'
# Voorkeur: Engels en niet 'forced' (forced bevat alleen vertaalde borden/buitenlandse zinnen)
pick=$(awk -F, -v c="^($text_codecs)\$" '$2 ~ c && $NF ~ /^(eng|en)$/ && $3 == 0 {print $1; exit}' <<<"$tracks")
if [[ -z "$pick" ]]; then
  pick=$(awk -F, -v c="^($text_codecs)\$" '$2 ~ c && $NF ~ /^(eng|en)$/ {print $1; exit}' <<<"$tracks")
fi

if [[ -z "$pick" ]]; then
  echo "Geen Engels tekstspoor gevonden. Sporen (index,codec,forced,taal):" >&2
  echo "$tracks" >&2
  exit 3
fi

ffmpeg -v error -y -i "$mkv" -map "0:$pick" -c:s srt "$out"
echo "Spoor $pick geëxporteerd naar $out"
