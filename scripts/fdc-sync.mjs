#!/usr/bin/env node
/*
 * Pull exact per-100 g values from USDA FoodData Central for every ingredient in
 * src/data/fdc-map.json and write src/data/fdc-nutrients.json.
 *
 *   # from the SR Legacy bulk CSV (download + unzip from https://fdc.nal.usda.gov/download-datasets/)
 *   node scripts/fdc-sync.mjs --csv path/to/FoodData_Central_sr_legacy_food_csv_2018-04
 *
 *   # or from the API (free key: https://fdc.nal.usda.gov/api-key-signup; DEMO_KEY works for a few calls)
 *   FDC_API_KEY=... node scripts/fdc-sync.mjs --api
 *
 *   # find candidate records while mapping a new ingredient
 *   node scripts/fdc-sync.mjs --csv <dir> --search "chicken.*breast.*raw"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = join(ROOT, 'src/data/fdc-map.json');
const OUT = join(ROOT, 'src/data/fdc-nutrients.json');

// Bulk CSV uses nutrient ids; the API's abridged format uses the older nutrient numbers.
const NUTRIENTS = { 1008: 'kcal', 1003: 'protein', 1005: 'carbs', 1004: 'fat', 1079: 'fiber' };
const NUTRIENT_NUMBERS = { 208: 'kcal', 203: 'protein', 205: 'carbs', 204: 'fat', 291: 'fiber' };

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function readCsv(file, onRow) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const head = parseCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = parseCsvLine(lines[i]);
    onRow(Object.fromEntries(head.map((h, j) => [h, cells[j]])));
  }
}

function fromCsv(dir, wanted) {
  const foods = new Map();
  readCsv(join(dir, 'food.csv'), (r) => {
    if (!wanted || wanted.has(Number(r.fdc_id))) foods.set(Number(r.fdc_id), { description: r.description, dataType: r.data_type });
  });
  readCsv(join(dir, 'food_nutrient.csv'), (r) => {
    const key = NUTRIENTS[r.nutrient_id];
    const f = foods.get(Number(r.fdc_id));
    if (key && f) f[key] = Number(r.amount);
  });
  return foods;
}

async function fromApi(ids) {
  const key = process.env.FDC_API_KEY || 'DEMO_KEY';
  const foods = new Map();
  for (let i = 0; i < ids.length; i += 20) {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods?api_key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fdcIds: ids.slice(i, i + 20), format: 'abridged', nutrients: Object.keys(NUTRIENT_NUMBERS).map(Number) }),
    });
    if (!res.ok) throw new Error(`FDC API ${res.status}: ${await res.text()}`);
    for (const f of await res.json()) {
      const row = { description: f.description, dataType: f.dataType };
      for (const n of f.foodNutrients ?? []) {
        const k = NUTRIENT_NUMBERS[Number(n.number ?? n.nutrientNumber)];
        if (k) row[k] = n.amount ?? n.value;
      }
      foods.set(f.fdcId, row);
    }
  }
  return foods;
}

const csvDir = opt('--csv');
const search = opt('--search');

if (search) {
  if (!csvDir) throw new Error('--search needs --csv <dir>');
  const all = fromCsv(csvDir);
  // --search may be repeated; each pattern gets its own block.
  const patterns = args.flatMap((a, i) => (a === '--search' ? [args[i + 1]] : []));
  for (const pattern of patterns) {
    const re = new RegExp(pattern, 'i');
    if (patterns.length > 1) console.log(`== ${pattern}`);
    let shown = 0;
    for (const [id, f] of all)
      if (re.test(f.description) && shown++ < 6)
        console.log(`${id}\t${f.kcal ?? '?'} kcal\tP ${f.protein ?? '?'}\tC ${f.carbs ?? '?'}\tF ${f.fat ?? '?'}\tfib ${f.fiber ?? '?'}\t${f.description}`);
  }
  process.exit(0);
}

const map = JSON.parse(readFileSync(MAP, 'utf8'));
const ids = [...new Set(Object.values(map).filter((m) => m.fdcId !== undefined).map((m) => m.fdcId))];
const foods = csvDir ? fromCsv(csvDir, new Set(ids)) : args.includes('--api') ? await fromApi(ids) : null;
if (!foods) {
  console.error('Pass --csv <dir> or --api');
  process.exit(1);
}

const out = {};
const missing = [];
for (const id of ids.sort((a, b) => a - b)) {
  const f = foods.get(id);
  if (!f || f.kcal === undefined) {
    missing.push(id);
    continue;
  }
  out[id] = {
    description: f.description,
    dataType: f.dataType,
    kcal: f.kcal,
    protein: f.protein ?? 0,
    carbs: f.carbs ?? 0,
    fat: f.fat ?? 0,
    fiber: f.fiber ?? 0,
  };
}
writeFileSync(OUT, `${JSON.stringify({ source: csvDir ? 'USDA FoodData Central, SR Legacy (April 2018) bulk CSV' : 'USDA FoodData Central API', generatedAt: new Date().toISOString().slice(0, 10), foods: out }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out).length} records to ${OUT}`);
if (missing.length) {
  console.error(`Missing or without energy: ${missing.join(', ')}`);
  process.exit(1);
}
