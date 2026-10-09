# Ondertitels vertalen met Claude Code

Een [Claude Code](https://claude.com/claude-code)-skill die de Engelse
tekstondertitels uit MKV-bestanden haalt, naar het Nederlands vertaalt en als
`.nl.srt` naast de video zet. Plex, Jellyfin en VLC pakken die automatisch op.
De MKV zelf blijft onaangeroerd, tenzij je expliciet vraagt het spoor erin te
zetten.

## Vereisten

- Claude Code
- `ffmpeg` en `ffprobe`
- Node.js (voor `tools/srt.js`, geen npm-pakketten nodig)
- Optioneel `mkvmerge` (MKVToolNix), alleen om een spoor in de MKV te zetten

## Installatie

```bash
git clone https://github.com/rvanderend/ondertitels.git
cd ondertitels
```

Staan je video's niet in `/media/video`? Pas dan in `.claude/settings.json`
de map aan in `additionalDirectories` en in de regel
`Edit(//media/video/**/*.nl.srt)` (dubbele `/` = absoluut pad).

## Gebruik

Start Claude Code in de projectmap en geef een bestand of map op:

```
/vertaal /media/video/Films/Voorbeeld (2024)/Voorbeeld (2024).mkv
/vertaal /media/video/Series/Voorbeeld/Seizoen 01
```

Per film gebeurt dit:

1. `tools/extract.sh` haalt het Engelse tekstspoor eruit. Films die al een
   Nederlands spoor of `.nl.srt` hebben worden overgeslagen.
2. `tools/srt.js split` deelt de ondertitels op in blokken van 250.
3. Elk blok wordt parallel vertaald door een subagent op Sonnet.
4. `tools/srt.js merge` voegt alles samen en controleert dat elke ondertitel
   vertaald is en dat de tijdcodes gelijk blijven.
5. Het resultaat komt als `<film>.nl.srt` naast de MKV.

Alleen tekstondertitels (SRT/ASS) worden ondersteund. Beeldondertitels
(PGS/VobSub) worden gemeld en overgeslagen.
