/**
 * Picks a freely licensed photo from Wikimedia Commons for every recipe and cuisine,
 * saves a 600 px WebP copy in public/food/ and records the credit line the licence asks for.
 *
 *   npx vite-node scripts/export-recipes.ts > scripts/.recipes.json
 *   node scripts/fetch-photos.mjs              (only fetches what is missing)
 *   node scripts/fetch-photos.mjs --refresh id1,id2   (re-pick these)
 *
 * Search terms and hand-picked files live in scripts/photo-queries.mjs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CUISINE_QUERIES, FILES, QUERIES, SKIP } from './photo-queries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'food');
const CREDITS = join(ROOT, 'src', 'data', 'photo-credits.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'WeekPlate-photo-picker/1.0 (pant3ras+weekplan@gmail.com)';
const WIDTH = 600;
/** Licences that allow reuse in an app with a credit line. */
const OK_LICENCE = /^(CC0|Public domain|PD|CC BY(-SA)? [1-4]\.0|CC BY(-SA)? 2\.5|CC BY(-SA)? 3\.0)/i;

mkdirSync(OUT, { recursive: true });
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
const refreshArg = process.argv.indexOf('--refresh');
const refresh = new Set(refreshArg > 0 ? process.argv[refreshArg + 1].split(',') : []);

const recipes = JSON.parse(readFileSync(join(ROOT, 'scripts', '.recipes.json'), 'utf8'));
const jobs = [
  ...Object.entries(CUISINE_QUERIES).map(([cuisine, q]) => ({ key: `cuisine-${cuisine.toLowerCase().replace(/\s+/g, '-')}`, query: q })),
  ...recipes.filter((r) => !SKIP.includes(r.id)).map((r) => ({ key: r.id, query: QUERIES[r.id] ?? defaultQuery(r.en) })),
];

function defaultQuery(name) {
  return name
    .split(/ with | — | – | \(| on | in |, /i)[0]
    .replace(/^(crispy|homemade|quick|lighter|classic|easy|spiced|smoky|double|slow-cooked|stovetop|no-bake)\s+/gi, '')
    .trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`Commons API failed for ${url}`);
}

const INFO = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(WIDTH), iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|UsageTerms' };

function usable(page) {
  const ii = page.imageinfo?.[0];
  if (!ii || !/jpeg|png|webp/.test(ii.mime)) return null;
  if (ii.width < 700 || ii.height < 450) return null;
  const m = ii.extmetadata ?? {};
  const licence = strip(m.LicenseShortName?.value);
  if (!OK_LICENCE.test(licence)) return null;
  return {
    file: page.title,
    thumb: ii.thumburl,
    page: ii.descriptionurl,
    author: strip(m.Artist?.value) || 'Unknown author',
    licence,
    licenceUrl: m.LicenseUrl?.value ?? '',
    ratio: ii.width / ii.height,
  };
}

async function candidates(query) {
  const data = await api({ action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '12', ...INFO });
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  return pages.map(usable).filter(Boolean);
}

async function byTitle(title) {
  const data = await api({ action: 'query', titles: title, ...INFO });
  return Object.values(data.query?.pages ?? {}).map(usable).filter(Boolean);
}

let fetched = 0;
let missing = [];
for (const job of jobs) {
  const target = join(OUT, `${job.key}.webp`);
  if (credits[job.key] && existsSync(target) && !refresh.has(job.key)) continue;
  try {
    const pinned = FILES[job.key];
    const list = pinned ? await byTitle(pinned) : await candidates(job.query);
    // Prefer landscape photos: they fill the card without cutting the dish in half.
    const pick = list.find((c) => c.ratio >= 1.1 && c.ratio <= 2) ?? list[0];
    if (!pick) {
      missing.push(`${job.key} ("${job.query}")`);
      continue;
    }
    const img = await fetch(pick.thumb, { headers: { 'User-Agent': UA } });
    if (!img.ok) throw new Error(`download ${img.status}`);
    // About 40 KB each, so the whole set adds a few MB to the APK.
    await sharp(Buffer.from(await img.arrayBuffer())).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toFile(target);
    const { thumb, ratio, ...credit } = pick;
    credits[job.key] = { ...credit, query: pinned ? undefined : job.query };
    fetched++;
    console.log(`${job.key.padEnd(34)} ${pick.file}`);
  } catch (e) {
    missing.push(`${job.key}: ${e.message}`);
  }
  await sleep(400);
}

writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + '\n');
console.log(`\n${fetched} photos fetched, ${Object.keys(credits).length} in total.`);
if (missing.length) console.log(`No usable photo for:\n  ${missing.join('\n  ')}`);
