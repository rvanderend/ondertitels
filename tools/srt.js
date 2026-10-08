#!/usr/bin/env node
// Hulpscript voor het vertalen van SRT-ondertitels in blokken.
//
//   node tools/srt.js split <bron.srt> <werkmap> [--size 250]
//       Deelt de ondertitels op in blokken: <werkmap>/blok_001.txt, ...
//       Alleen de tekst gaat mee; nummers en tijdcodes blijven in het origineel.
//
//   node tools/srt.js merge <bron.srt> <werkmap> <doel.srt>
//       Leest <werkmap>/blok_NNN.nl.txt, controleert dat elke ondertitel
//       precies één keer vertaald is en schrijft <doel.srt> met de
//       oorspronkelijke tijdcodes.
//
// Blokformaat (in en uit):
//   [12]
//   eerste regel
//   tweede regel
//   [13]
//   ...
// Alles vóór de eerste [n]-markering (de contextkop) wordt genegeerd.

const fs = require('fs');
const path = require('path');

const MARKER = /^\[(\d+)\]$/;

function fail(msg) {
  console.error('FOUT: ' + msg);
  process.exit(1);
}

function readSrt(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const cues = [];
  for (const block of raw.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((l, i, a) => !(l.trim() === '' && (i === 0 || i === a.length - 1)));
    if (lines.length === 0) continue;
    // Het volgnummer is optioneel; sommige rips laten het weg.
    let i = 0;
    if (/^\d+\s*$/.test(lines[0]) && lines[1] && lines[1].includes('-->')) i = 1;
    if (!lines[i] || !lines[i].includes('-->')) continue;
    cues.push({ time: lines[i].trim(), text: lines.slice(i + 1).join('\n').trim() });
  }
  if (cues.length === 0) fail(`geen ondertitels gevonden in ${file}`);
  return cues;
}

function writeSrt(file, cues) {
  const out = cues.map((c, i) => `${i + 1}\n${c.time}\n${c.text}\n`).join('\n');
  fs.writeFileSync(file, out, 'utf8');
}

function parseBlocks(text) {
  const result = new Map();
  let id = null;
  let buf = [];
  const flush = () => {
    if (id === null) return;
    if (result.has(id)) fail(`ondertitel [${id}] komt dubbel voor`);
    result.set(id, buf.join('\n').trim());
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.trim().match(MARKER);
    if (m) {
      flush();
      id = Number(m[1]);
      buf = [];
    } else if (id !== null) {
      buf.push(line);
    }
  }
  flush();
  return result;
}

function split(src, dir, size) {
  const cues = readSrt(src);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^blok_\d+(\.nl)?\.txt$/.test(f)) fs.unlinkSync(path.join(dir, f));

  // Lege ondertitels hoeven niet vertaald te worden; merge laat ze weg.
  const todo = cues.map((c, i) => ({ id: i + 1, text: c.text })).filter((c) => c.text !== '');
  let n = 0;
  for (let start = 0; start < todo.length; start += size) {
    n++;
    const chunk = todo.slice(start, start + size);
    const context = todo.slice(Math.max(0, start - 5), start);
    let body = '';
    if (context.length) {
      body += '=== CONTEXT: voorafgaande ondertitels, NIET vertalen of overnemen ===\n';
      body += context.map((c) => c.text).join('\n') + '\n\n';
    }
    body += '=== VERTALEN ===\n';
    body += chunk.map((c) => `[${c.id}]\n${c.text}`).join('\n') + '\n';
    fs.writeFileSync(path.join(dir, `blok_${String(n).padStart(3, '0')}.txt`), body, 'utf8');
  }
  console.log(JSON.stringify({ ondertitels: cues.length, te_vertalen: todo.length, blokken: n }));
}

function merge(src, dir, dest) {
  const cues = readSrt(src);
  const sources = fs.readdirSync(dir).filter((f) => /^blok_\d+\.txt$/.test(f)).sort();
  if (sources.length === 0) fail(`geen blokken gevonden in ${dir}`);

  const translated = new Map();
  const problems = [];
  for (const f of sources) {
    const expected = [...parseBlocks(fs.readFileSync(path.join(dir, f), 'utf8')).keys()];
    const nlFile = path.join(dir, f.replace(/\.txt$/, '.nl.txt'));
    if (!fs.existsSync(nlFile)) {
      problems.push(`${path.basename(nlFile)} ontbreekt`);
      continue;
    }
    const got = parseBlocks(fs.readFileSync(nlFile, 'utf8'));
    const missing = expected.filter((id) => !got.has(id) || got.get(id) === '');
    const extra = [...got.keys()].filter((id) => !expected.includes(id));
    if (missing.length) problems.push(`${path.basename(nlFile)}: ontbrekend of leeg: ${missing.join(', ')}`);
    if (extra.length) problems.push(`${path.basename(nlFile)}: onverwachte nummers: ${extra.join(', ')}`);
    for (const [id, text] of got) translated.set(id, text);
  }
  if (problems.length) fail('vertaling onvolledig:\n  ' + problems.join('\n  '));

  // Lege ondertitels vallen weg; spelers struikelen soms over een blok zonder tekst.
  const out = cues
    .map((c, i) => ({ time: c.time, text: c.text === '' ? '' : translated.get(i + 1) }))
    .filter((c) => c.text !== '');
  writeSrt(dest, out);
  console.log(JSON.stringify({ geschreven: dest, ondertitels: out.length }));
}

const [cmd, ...args] = process.argv.slice(2);
const sizeIdx = args.indexOf('--size');
const size = sizeIdx >= 0 ? Number(args.splice(sizeIdx, 2)[1]) : 250;

if (cmd === 'split' && args.length === 2) split(args[0], args[1], size);
else if (cmd === 'merge' && args.length === 3) merge(args[0], args[1], args[2]);
else fail('gebruik: srt.js split <bron.srt> <werkmap> [--size N] | srt.js merge <bron.srt> <werkmap> <doel.srt>');
