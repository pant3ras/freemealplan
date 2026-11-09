#!/usr/bin/env node
/*
 * Build src/data/prices.json: the cheapest matching product per ingredient at one
 * Kaufland, Lidl, Carrefour, Mega Image and Selgros store near a location, using Monitorul
 * Prețurilor — the Romanian Competition Council's public price monitor
 * (https://monitorulpreturilor.info), which the chains feed with shelf prices daily.
 *
 *   node scripts/prices-sync.mjs                          # stores around Iași centre
 *   node scripts/prices-sync.mjs --lat 44.4268 --lon 26.1025 --label "București"
 *   node scripts/prices-sync.mjs --stores kaufland=1385,lidl=3197
 *   node scripts/prices-sync.mjs --only chicken-breast,eggs --verbose
 *
 * Raw responses are cached in scripts/.cache for the day, so re-running after tweaking
 * price-queries.mjs costs no extra requests. Requests are sequential and spaced out.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUERIES } from './price-queries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/prices.json');
const CACHE = join(ROOT, 'scripts/.cache');
const API = 'https://monitorulpreturilor.info/pmonsvc/Retail';

/**
 * `prefer` ranks store formats: a hypermarket or full supermarket stocks far more than an express shop.
 * `noFresh`: the chain doesn't report loose fruit and veg to the monitor, so a "fresh" search there only
 * ever finds products that merely mention the word (olives with garlic, pickled gherkins, ginger jam…).
 */
const CHAINS = {
  kaufland: { name: 'Kaufland', networkId: 'KAUFLAND', prefer: [], noFresh: true },
  lidl: { name: 'Lidl', networkId: '4055329000008', prefer: [] },
  carrefour: { name: 'Carrefour', networkId: '5940475006709', prefer: [/^CARREFOUR\b/i, /MARKET/i] },
  mega: { name: 'Mega Image', networkId: '5940475870003', prefer: [/^MI\b/i] },
  selgros: { name: 'Selgros', networkId: 'SELGROS', prefer: [], noFresh: true },
};

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const LAT = Number(opt('--lat', 47.1622));
const LON = Number(opt('--lon', 27.5889));
const RADIUS = Number(opt('--radius', 4000));
// A chain with no store within --radius (cash & carry is usually on the edge of town) is looked for this far out.
const FAR_RADIUS = Number(opt('--far-radius', 25000));
const LABEL = opt('--label', 'Iași');
const ONLY = opt('--only')?.split(',');
const STORE_OVERRIDES = Object.fromEntries((opt('--stores') ?? '').split(',').filter(Boolean).map((kv) => kv.split('=')));
const VERBOSE = args.includes('--verbose');
const DELAY_MS = 900;

const norm = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;
let requests = 0;

async function get(path) {
  mkdirSync(CACHE, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = join(CACHE, `${day}-${createHash('sha1').update(path).digest('hex').slice(0, 16)}.xml`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  requests++;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API + path, { headers: { 'User-Agent': 'WeekPlate price sync (personal meal planner)' } });
    if (res.ok) {
      const text = await res.text();
      writeFileSync(file, text);
      return text;
    }
    if (attempt >= 3) throw new Error(`${res.status} for ${path.slice(0, 120)}`);
    await sleep(3000 * attempt);
  }
}

const tag = (s, t) => s.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1];
const decode = (s) => (s ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Every store of the given chains within the radius (the endpoint needs some product ids to answer). */
async function discoverStores(chains = Object.values(CHAINS), radius = RADIUS) {
  const catalog = await get(`/GetCatalogProductsByNameNetwork?prodname=${encodeURIComponent('lapte')}`);
  const ids = [...catalog.matchAll(/<CatalogProduct><Id>(\d+)<\/Id>/g)].slice(0, 10).map((m) => m[1]);
  const nets = chains.map((c) => c.networkId).join(',');
  const xml = await get(`/GetStoresForProductsByLatLon?lat=${LAT}&lon=${LON}&buffer=${radius}&csvprodids=${ids.join(',')}&csvnetworkids=${nets}`);
  return xml
    .replace(/<Area>[\s\S]*?<\/Area>|<Areawkt>[\s\S]*?<\/Areawkt>/g, '')
    .split('<RetailStore>')
    .slice(1)
    .map((s) => {
      const m = s.match(/<Distance>([^<]*)<\/Distance><Id>(\d+)<\/Id>/);
      return {
        id: m?.[2],
        distance: Number(m?.[1]),
        name: decode(s.match(/<\/Logo><Name>([^<]*)<\/Name>/)?.[1]),
        address: decode(tag(s, 'Addrstring')),
        network: tag(s, 'Networkid'),
      };
    })
    .filter((s) => s.id && s.network);
}

function pickStores(stores) {
  const chosen = {};
  for (const [key, chain] of Object.entries(CHAINS)) {
    const mine = stores.filter((s) => s.network === chain.networkId);
    if (STORE_OVERRIDES[key]) {
      chosen[key] = mine.find((s) => s.id === STORE_OVERRIDES[key]) ?? { id: STORE_OVERRIDES[key], name: `store ${STORE_OVERRIDES[key]}`, distance: null };
      continue;
    }
    const rank = (s) => {
      const i = chain.prefer.findIndex((re) => re.test(s.name));
      return i < 0 ? chain.prefer.length : i;
    };
    mine.sort((a, b) => rank(a) - rank(b) || a.distance - b.distance);
    if (mine[0]) chosen[key] = mine[0];
  }
  return chosen;
}

async function searchStore(storeId, term) {
  const xml = await get(`/GetProductsFromStore?categid=&storeid=${storeId}&prodname=${encodeURIComponent(term)}`);
  return xml
    .split('<Product>')
    .slice(1)
    .map((p) => ({
      catalogName: decode(p.match(/<Catprod><Id>\d+<\/Id><Name>([^<]*)<\/Name>/)?.[1]),
      name: decode(p.match(/<\/Catprod><Id>\d+<\/Id><Name>([^<]*)<\/Name>/)?.[1]),
      category: decode(tag(p, 'Retailcategname')),
      price: Number(tag(p, 'Price')),
      unit: decode(tag(p, 'Unit')),
      promo: !!tag(p, 'Promo'),
      date: tag(p, 'Pricedate'),
    }))
    .filter((r) => r.price > 0);
}

/** Grams in one pack, read from the product name or the unit text ("650 GR", "ca. 1 kg", "3X100G", "1L", "10 BUC"). */
function packGrams(text, cfg) {
  const t = norm(text).replace(/(\d),(\d)/g, '$1.$2');
  const toG = (n, u) => {
    const x = Number(n);
    if (/^K/.test(u)) return x * 1000;
    if (/^(L|LITR)/.test(u)) return x * 1000 * (cfg.density ?? 1);
    if (/^ML/.test(u)) return x * (cfg.density ?? 1);
    return x;
  };
  // Eggs are counted ("10BUC"); "2 L" on an egg box is the farming code and size, not litres.
  if (cfg.eggs) {
    const n = t.match(/(?<!\d)(\d{1,2})\s*(?:BUC|BUCATI|OUA|PCS|PC|X)(?![A-Z])/) ?? t.match(/(?:\bX|\*)\s?(\d{1,2})\b/);
    return n ? Number(n[1]) * cfg.eggs : null;
  }
  const multi = t.match(/(\d+)\s*X\s*(\d+(?:\.\d+)?)\s*(KG|G|GR|ML|L)(?![A-Z])/);
  if (multi) return Number(multi[1]) * toG(multi[2], multi[3]);
  // Carrefour glues the brand onto the size ("360GRAURENI", "1KGBITAR"), so weights may run into letters.
  const sizes = [...t.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*(?:(KGR|KG|GRAME|GR|G|ML)|(LITRI|LITRU|L)(?![A-Z]))/g)].map((m) => [m[0], m[1], m[2] ?? m[3]]);
  if (sizes.length) {
    const m = sizes[sizes.length - 1];
    return toG(m[1], m[2]);
  }
  return null;
}

const KG_UNIT = /^(KG|KGM|KILOGRAM|KILOGRAME)$/i;
// Carrefour reports "K" both for loose produce (per kg) and for packs (per piece).
const AMBIGUOUS_UNIT = /^K$/i;

/** Work out what the shelf price buys: a pack of N grams, or 1 kg sold by weight. */
function interpret(row, cfg) {
  const unit = row.unit.trim();
  // Lidl lists loose produce with unit "1kg" — a price per kg, not a 1 kg bag — and no size in the name.
  const looseProduce = cfg.fresh && /^(CA\.\s*)?1\s?KG$/i.test(unit) && !packGrams(row.name, cfg);
  const byKg = KG_UNIT.test(unit) || looseProduce;
  const ambiguous = AMBIGUOUS_UNIT.test(unit);
  const grams = (byKg || ambiguous ? null : packGrams(unit, cfg)) ?? packGrams(row.name, cfg) ?? packGrams(row.catalogName, cfg);
  const drained = (g) => (cfg.drained ? Math.round(g * cfg.drained) : g);
  const options = [];
  if (grams) options.push({ grams: drained(grams), perKg: (row.price / drained(grams)) * 1000 });
  // A per-kg price only when the unit says so, or a bare "K" with no size in the name.
  if (byKg || (ambiguous && !grams)) options.push({ grams: null, perKg: row.price });
  if (!grams && cfg.each && !byKg) options.push({ grams: cfg.each, perKg: (row.price / cfg.each) * 1000 });
  if (byKg) options.reverse();
  const [lo, hi] = cfg.kg;
  return options.find(
    (o) => o.perKg >= lo && o.perKg <= hi && (o.grams === null || (o.grams <= (cfg.maxPack ?? 3000) && o.grams >= (cfg.minPack ?? 0))),
  );
}

// Shelf categories that never hold a recipe ingredient (drinks, sweets, baby food, ready meals…).
const NEVER_CAT =
  /BEBE|BEBELUS|BORCANEL|PIURE|ANIMAL|PISIC|CAINI|COSMETIC|CURATENIE|DETERGENT|BERE|CIDRU|\bVIN|SPIRT|LICHIOR|JELEU|BOMBOANE|DULCIURI|CIOCOLAT|BISCUIT|NAPOLITANE|CHIPS|SNACK|SARATELE|PATEURI|IMBISS|GATIT|SALATE|SANDWICH|SANDVIS|PAINE PRAJITA|INGHETATA|DESERT|PRAJITUR|COFETARIE|PATISERIE|MUSLI|CEREALE MIC|CARBO|LIMONAD|CIORBE|SUPE|PASTE PROASPETE|ENERGIZ|ICE TEA/;
const DRINK_CAT = /BAUT|\bSUC|NECTAR|\bAPA\b|LAPTE UHT|IAURTURI DE BAUT|SIROP/;
// Shelf names that are never a raw ingredient.
const NEVER_NAME = /\bSUPA\b|CIORBA|TORTELL|RAVIOL|LASAGN|PIZZA|SANDWICH|GATA DE SERVIT|\bMANCARE\b|BAUTURA|\bSUC\b|NECTAR/;
// For fresh produce: not canned, pickled, frozen, dried or bottled.
const NOT_FRESH_CAT = /CONSERV|MURATUR|ANTIPASTI|CONGELAT|\bCONG|USCAT|DESHIDRAT|\bSOS|CONDIMENT|CASTRAVETI MURATI/;
const NOT_FRESH_NAME = /SARAMURA|OTET|CONSERV|BORCAN|\d\s?ML|\d(?:\.\d+)?\s?L\b|CONGELAT|MURAT|DECOJIT|TAIATE|PASAT|TOCATE|CORNICHON|USCAT|\bPIC\b/;

/** The store's own shelf name has to look like the ingredient; the catalogue name and shelf category can only veto. */
function matches(row, cfg) {
  const shelf = norm(row.name);
  const cat = norm(row.category);
  if (!cfg.must.every((re) => re.test(shelf)) || cfg.not?.test(shelf)) return false;
  if (cfg.not?.test(norm(row.catalogName)) || (!cfg.drink && NEVER_NAME.test(shelf))) return false;
  if (NEVER_CAT.test(cat) || (!cfg.drink && DRINK_CAT.test(cat)) || cfg.notCat?.test(cat)) return false;
  if (cfg.fresh && (NOT_FRESH_CAT.test(cat) || NOT_FRESH_NAME.test(shelf))) return false;
  return true;
}

async function syncIngredient(cfg, stores) {
  const result = {};
  for (const [chain, store] of Object.entries(stores)) {
    if (cfg.fresh && CHAINS[chain].noFresh) continue;
    const rows = [];
    for (const term of cfg.q) rows.push(...(await searchStore(store.id, term)));
    const seen = new Set();
    const candidates = rows
      .filter((r) => !seen.has(r.name + r.price) && seen.add(r.name + r.price))
      .filter((r) => matches(r, cfg))
      .map((r) => ({ ...r, ...interpret(r, cfg) }))
      .filter((r) => r.perKg);
    const regular = candidates.filter((c) => !c.promo);
    const pool = (regular.length ? regular : candidates).sort((a, b) => a.perKg - b.perKg);
    if (VERBOSE) {
      console.log(`  ${chain}: ${candidates.length} matches of ${rows.length}`);
      for (const c of pool.slice(0, 4))
        console.log(`     ${c.perKg.toFixed(2).padStart(7)} lei/kg  ${c.price} lei ${c.grams ? `/${c.grams} g` : '/kg'}  ${c.name}  [${c.unit}] {${c.category}}${c.promo ? ' PROMO' : ''}`);
    }
    const best = pool[0];
    if (best)
      result[chain] = {
        product: best.name.replace(/^BUC_/, '').replace(/\s+-$/, '').trim(),
        price: best.price,
        grams: best.grams,
        perKg: Math.round(best.perKg * 100) / 100,
        promo: best.promo,
        date: best.date?.split(' ')[0],
      };
  }
  return result;
}

const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
const stores = pickStores(await discoverStores());
const far = Object.keys(CHAINS).filter((k) => !stores[k]);
if (far.length) Object.assign(stores, pickStores(await discoverStores(far.map((k) => CHAINS[k]), FAR_RADIUS)), stores);
console.log('Stores:');
for (const [k, s] of Object.entries(stores)) console.log(`  ${CHAINS[k].name.padEnd(10)} #${s.id} ${s.name} (${s.distance ?? '?'} km)`);

const out = {
  source: 'Monitorul Prețurilor — Consiliul Concurenței (monitorulpreturilor.info)',
  fetchedAt: new Date().toISOString().slice(0, 10),
  location: { label: LABEL, lat: LAT, lon: LON },
  chains: Object.fromEntries(
    Object.entries(CHAINS).map(([k, v]) => [
      k,
      {
        name: v.name,
        store: stores[k] ? { id: stores[k].id, name: stores[k].name, address: stores[k].address, distanceKm: stores[k].distance } : null,
        items: ONLY ? (existing?.chains?.[k]?.items ?? {}) : {},
      },
    ]),
  ),
};

for (const id of ONLY ?? Object.keys(QUERIES)) {
  const cfg = QUERIES[id];
  if (!cfg) {
    console.error(`No query for ${id}`);
    continue;
  }
  try {
    if (VERBOSE) console.log(id);
    const result = await syncIngredient(cfg, stores);
    const found = Object.keys(result);
    console.log(`${id.padEnd(18)} ${found.length ? found.map((k) => `${k} ${result[k].perKg}`).join(' · ') : 'not found'}`);
    for (const k of Object.keys(CHAINS)) {
      if (result[k]) out.chains[k].items[id] = result[k];
      else delete out.chains[k].items[id];
    }
  } catch (e) {
    console.error(`${id}: ${e.message}`);
  }
}

writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
const total = Object.keys(QUERIES).length;
console.log(`\n${requests} requests`);
for (const c of Object.values(out.chains)) console.log(`${c.name}: ${Object.keys(c.items).length}/${total} ingredients`);
