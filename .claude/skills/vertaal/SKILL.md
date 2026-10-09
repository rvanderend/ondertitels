---
name: vertaal
description: Vertaal de Engelse tekstondertitels van een MKV-bestand (of alle MKV's in een map) naar het Nederlands en zet ze als .nl.srt naast de video. Gebruik bij "/vertaal <pad>" of als de gebruiker vraagt ondertitels van een film of serie te vertalen.
---

# Ondertitels vertalen (EN → NL)

Argument: een pad naar een `.mkv`, of een map. Bij een map: zoek met
`find <map> -type f -name '*.mkv' | sort` en verwerk de bestanden **één voor één**
met de stappen hieronder. Houd een lijstje bij van gelukt / overgeslagen / mislukt.

Werk vanuit de projectmap (de map met `tools/` en `.claude/`). Per film is de werkmap
`werk/<bestandsnaam zonder .mkv>/`.

## Stappen per film

1. **Spoor eruit halen**
   ```bash
   tools/extract.sh "<film.mkv>" "werk/<naam>/en.srt"
   ```
   (maak de werkmap eerst aan). Exitcode 2 = heeft al Nederlands → overslaan.
   Exitcode 3 = geen Engels tekstspoor → overslaan en de spoorlijst melden.

2. **Opdelen in blokken**
   ```bash
   node tools/srt.js split "werk/<naam>/en.srt" "werk/<naam>"
   ```
   Dit maakt `blok_001.txt`, `blok_002.txt`, ... (250 ondertitels per blok).

3. **Vertalen met subagents** — start voor álle blokken tegelijk een Agent
   (`subagent_type: general-purpose`, `model: sonnet`) in één bericht. Vertaal
   de blokken niet zelf in deze sessie: dat vult de context en draait op het
   zwaardere sessiemodel. Prompt per agent (vul de paden in):

   > Lees `<abs pad>/blok_NNN.txt`. Vertaal alle ondertitels onder
   > `=== VERTALEN ===` van het Engels naar natuurlijk, gesproken Nederlands en
   > schrijf het resultaat naar `<abs pad>/blok_NNN.nl.txt`.
   > De kop `=== CONTEXT ===` is alleen ter informatie: niet vertalen, niet overnemen.
   > Regels:
   > - Behoud elke markering `[n]` exact, in dezelfde volgorde; elk nummer precies één keer, geen extra.
   > - Zet onder elke markering alleen de vertaalde tekst, met hetzelfde aantal regels als het origineel (maximaal ongeveer 42 tekens per regel; liever iets inkorten dan te lang).
   > - Tags zoals `<i>`, `</i>`, `{\an8}` en tekens als `♪` en `- ` aan het begin van een regel blijven staan.
   > - Informeel ("je/jij"), tenzij de situatie duidelijk formeel is. Namen, plaatsnamen en titels niet vertalen.
   > - Vertaal betekenis, niet woord voor woord. Schrijf geen uitleg of opmerkingen in het bestand.
   > Antwoord daarna alleen met "klaar" of met een korte beschrijving van een probleem.

4. **Samenvoegen en controleren**
   ```bash
   node tools/srt.js merge "werk/<naam>/en.srt" "werk/<naam>" "<film zonder .mkv>.nl.srt"
   ```
   Het script weigert als er nummers ontbreken, leeg zijn of dubbel voorkomen en
   noemt het blok. Laat dan alleen dat blok opnieuw vertalen (nieuwe agent, zelfde
   prompt) en draai merge opnieuw. Na twee mislukte pogingen: film als mislukt melden.

5. **Steekproef** — lees 10 willekeurige ondertitels uit het resultaat naast het
   origineel. Duidelijk Engels laten staan of onzin → dat blok opnieuw.

6. **Opruimen** — verwijder `werk/<naam>/` na een geslaagde film.

## In de MKV zetten (alleen op verzoek)

Standaard blijft de MKV onaangeroerd en komt er een `.nl.srt` naast; Plex,
Jellyfin en VLC pakken die automatisch op. Alleen als de gebruiker expliciet om
een spoor ín de MKV vraagt:

```bash
mkvmerge -o "<film>.tmp.mkv" "<film>.mkv" \
  --language 0:dut --track-name 0:Nederlands "<film>.nl.srt"
mkvmerge -i "<film>.tmp.mkv"   # controleer dat het NL-spoor erin staat
```

Vervang het origineel pas daarna (`mv "<film>.tmp.mkv" "<film>.mkv"`) en verwijder
dan de `.nl.srt`.

## Afsluiten

Meld per film: gelukt (aantal ondertitels), overgeslagen (reden) of mislukt (reden).
