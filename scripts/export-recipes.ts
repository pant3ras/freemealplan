/**
 * Dumps id, cuisine and English name of every built-in recipe, for tooling such as the
 * photo picker.  npx vite-node scripts/export-recipes.ts > recipes.json
 */
import { RECIPE_BOOK } from '../src/data/recipe-book';

const rows = RECIPE_BOOK.map((r) => ({ id: r.id, cuisine: r.cuisine, en: r.name.en, slots: r.slots }));
process.stdout.write(JSON.stringify(rows, null, 1));
