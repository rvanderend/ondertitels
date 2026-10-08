# Ondertitels vertalen

Project om Engelse tekstondertitels uit MKV-bestanden naar het Nederlands te
vertalen. Werkwijze staat in de skill `/vertaal` (`.claude/skills/vertaal/SKILL.md`).

- Video's staan in `/media/video` (host: `/mnt/unas/storage/video`, NAS-share).
- `tools/extract.sh` haalt het Engelse tekstspoor eruit (ffprobe/ffmpeg).
- `tools/srt.js` deelt een SRT op in blokken en voegt de vertaling weer samen,
  met controle dat elke ondertitel vertaald is en de tijdcodes gelijk blijven.
- Tussenbestanden in `werk/` (staat niet in de video-map).

Uitgangspunten:
- Niet-destructief: standaard een `.nl.srt` naast de MKV. MKV's alleen
  aanpassen als de gebruiker daar expliciet om vraagt.
- Vertalen gebeurt door subagents op `sonnet`, niet in de hoofdsessie
  (tokenbeleid FB Group: lichtste model dat de kwaliteit haalt).
- Alleen tekstsporen (SRT/ASS). Beeldondertitels (PGS/VobSub) vallen buiten
  scope; meld ze en sla ze over.
