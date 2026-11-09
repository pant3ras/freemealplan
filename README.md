# WeekPlate — weekly meal planner (demo)

A local, clean-room demo of a "plan my week of meals" app in the style of Mealbird:
answer a few setup questions, get 7 days of meals where **every day** clears your
protein floor and lands in your calorie band, plus one aisle-sorted shopping list in
real pack sizes and a cooking plan. English and Romanian UI.

Also: a soup course (one pot covers ~3 days), removing a meal (the rest of the day
grows to compensate) with a swipe deck for picking a replacement, your own recipes and
ingredients, "cook from what I have" (tick what's in the fridge, see what you can make,
or plan the week around it), and an explanation of why each dish was planned.

No backend, no account, no API keys — everything runs and is stored in the browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:4150 (also reachable from your phone on the LAN)
npm test           # engine tests (targets, planner, shopping, cooking)
npm run build      # static build in dist/ — host it anywhere
```

## Android app

The same build, wrapped with Capacitor 8 (`android/`, app id `ro.panteras.weekplate`). Everything is
inside the APK — recipes, nutrition and price tables — and the app has **no internet permission**,
so nothing can leave the phone. Data lives in the WebView's localStorage and is mirrored into the
app's private SharedPreferences (restored from there if Android clears WebView storage). Cloud
backup is off (`allowBackup="false"`). Android extras: the back button closes sheets, then returns
to Plan, then exits; the shopping list uses the native share sheet; Print is hidden.

```bash
npm run apk        # tests -> web build -> cap sync -> Gradle -> android/app/build/outputs/apk/debug/app-debug.apk
npm run icons      # re-render launcher icons + splash from public/icon.svg
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Needs the Android SDK and **Java 21** (pinned by `org.gradle.java.home` in `android/gradle.properties`).
For Play Store: add a signing config, then `node scripts/build-apk.mjs bundleRelease`.

## What's inside

| Path | What it does |
| --- | --- |
| `src/data/ingredients.ts` | 123 ingredients: allergens, aisle, shelf life, fallback pack + price |
| `src/data/fdc-map.json` → `fdc-nutrients.json` | One USDA FoodData Central record per ingredient and its exact per-100 g values |
| `src/data/prices.json`, `prices.ts` | Shelf prices per chain (Kaufland, Lidl, Carrefour, Mega Image, Selgros) and the pricing rules |
| `src/data/recipe-book/*` | 179 original recipes (31 soups) across 12 cuisines + everyday dishes: bilingual names and steps (~7 per recipe), hands-on vs total time, difficulty, fridge life, tips |
| `src/data/recipes.ts`, `recipes-world.ts` | Merges the recipe book with the few older one-line recipes it doesn't replace |
| `src/data/custom.ts` | Slots the user's own recipes and ingredients into the same tables |
| `src/i18n/*`, `src/data/ingredient-names-ro.ts` | EN/RO strings, Romanian plurals, Romanian ingredient names |
| `src/data/cuisines.ts` | Card art (emoji, tagline, colours) for the cuisine swipe deck |
| `src/engine/targets.ts` | Mifflin–St Jeor calories + protein floor, every step returned for the UI |
| `src/engine/portion.ts` | Per-day portioning: scales meals and boosts lean-protein ingredients to hit targets |
| `src/engine/planner.ts` | Simulated-annealing planner (cuisine theme, soup pots, weekend long cooks, use-up list), swap ranking, lock / regenerate / reconcile |
| `src/engine/explain.ts` | Why each dish is in the plan (batch, soup pot, leftovers, theme, from home, protein, budget, quick, weekend) |
| `src/engine/kitchen.ts` | "Cook from what I have": matches recipes to what's at home, fewest main items to buy first |
| `src/engine/shopping.ts` | Aisle-sorted list, whole packs, food cost vs checkout, leftovers |
| `src/engine/cooking.ts` | Groups meals into batch-cooking sessions using each dish's fridge life |
| `src/ui/*` | React screens: onboarding, Plan, Cook, Shop, Recipes (all / from my kitchen / mine), Me; `CuisineSwipe` and `DishSwipe` decks, `RecipeEditor`, `Kitchen` |

See [SPEC.md](SPEC.md) for the feature list (what matches Mealbird, what's extra) and
ideas for next steps.

## Data

### Nutrition — USDA FoodData Central

Each ingredient maps to one FDC record in `src/data/fdc-map.json` (SR Legacy, the
generic-foods dataset). A handful have no exact record and use the closest one, with a
note shown in the app: skyr → nonfat Greek yogurt, telemea → feta, red-lentil pasta →
red lentils, mixed berries → raspberries, Kalamata → ripe black olives, canned lentils →
boiled lentils.

Refresh or add an ingredient:

```bash
# bulk CSV (no key): download + unzip SR Legacy CSV from https://fdc.nal.usda.gov/download-datasets/
node scripts/fdc-sync.mjs --csv path/to/FoodData_Central_sr_legacy_food_csv_2018-04
node scripts/fdc-sync.mjs --csv path/to/... --search "chicken.*breast.*raw"   # find a record id
# or via the API (free key from https://fdc.nal.usda.gov/api-key-signup)
FDC_API_KEY=... node scripts/fdc-sync.mjs --api
```

### Prices — Monitorul Prețurilor

`scripts/prices-sync.mjs` picks one full-size store per chain near a location and looks
every ingredient up in it on [Monitorul Prețurilor](https://monitorulpreturilor.info), the
Competition Council's public price monitor that the chains feed daily. For each chain it
keeps the cheapest regular-price product that matches the rules in
`scripts/price-queries.mjs` (search words, must/must-not patterns, a plausible lei/kg
range, drained weight for cans). Run it with `--verbose` to see the top candidates.

```bash
node scripts/prices-sync.mjs                                   # around Iași centre
node scripts/prices-sync.mjs --lat 44.4268 --lon 26.1025 --label "București"
node scripts/prices-sync.mjs --only eggs,tofu --verbose        # re-check a few items
```

Some items aren't reported by every chain (Kaufland reports no loose produce or fresh
eggs). The app then prices them at the other chains' median per kg and marks them "est.".

### Caveats

- Shelf prices change daily and differ between stores; re-run the price sync weekly.
- Product matching is rule-based. Spot-check `--verbose` output after editing the rules.
- Targets are general-population formulas, not medical advice.
