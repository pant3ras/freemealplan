import { useMemo, useState } from 'react';
import { newId } from '../data/custom';
import { INGREDIENT_LIST } from '../data/ingredients';
import { AISLE_ORDER, ALLERGENS, CUISINES, DIFFICULTIES, SLOTS, type Aisle, type Allergen, type Cuisine, type Difficulty, type FoodGroup, type Ingredient, type Recipe, type Slot } from '../data/types';
import { nutrientsOf } from '../engine/nutrition';
import { pick, texts } from '../i18n';
import { COMMON, ingredientName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { Chips, Icon, NumberField, Seg, Sheet } from './kit';

const EMOJIS = ['🍲', '🥘', '🍛', '🍝', '🍜', '🍕', '🍔', '🌮', '🌯', '🥗', '🥙', '🍗', '🥩', '🐟', '🍤', '🥚', '🍳', '🥞', '🥣', '🍚', '🥔', '🫘', '🥦', '🍄', '🧀', '🥪', '🍞', '🥟', '🍢', '🍎', '🍌', '🥜'];

const T = texts({
  en: {
    newTitle: 'Your recipe',
    editTitle: 'Edit your recipe',
    copyName: (n: string) => `${n} (my version)`,
    name: 'Name',
    emoji: 'Icon',
    slots: 'Good for',
    cuisine: 'Cuisine',
    minutes: 'Total time',
    active: 'Hands-on',
    keeps: 'Keeps (days)',
    difficulty: 'Difficulty',
    ingredients: 'Ingredients — grams for one serving',
    search: 'Add an ingredient… (type to search)',
    noMatch: 'Nothing found.',
    newIng: '+ My own ingredient',
    extras: 'Also needed — untracked (salt, spices, stock cube…), one per line',
    steps: 'Method — one step per line',
    tip: 'Tip (optional)',
    perServing: (k: number, p: number, c: number, f: number) => `Per serving: ${k} kcal · ${p} g protein · ${c} g carbs · ${f} g fat`,
    need: 'Add a name, at least one meal type, one ingredient and one step.',
    saved: 'Recipe saved — the planner can use it now',
    remove: 'Remove',
  },
  ro: {
    newTitle: 'Rețeta ta',
    editTitle: 'Editează rețeta',
    copyName: (n: string) => `${n} (varianta mea)`,
    name: 'Nume',
    emoji: 'Iconiță',
    slots: 'Potrivită pentru',
    cuisine: 'Bucătărie',
    minutes: 'Timp total',
    active: 'Lucru efectiv',
    keeps: 'Ține (zile)',
    difficulty: 'Dificultate',
    ingredients: 'Ingrediente — grame pentru o porție',
    search: 'Adaugă un ingredient… (scrie ca să cauți)',
    noMatch: 'Nu am găsit nimic.',
    newIng: '+ Ingredientul meu',
    extras: 'Mai trebuie — fără calcul (sare, condimente, cub de supă…), câte unul pe rând',
    steps: 'Mod de preparare — câte un pas pe rând',
    tip: 'Sfat (opțional)',
    perServing: (k: number, p: number, c: number, f: number) => `La porție: ${k} kcal · ${p} g proteine · ${c} g carbohidrați · ${f} g grăsimi`,
    need: 'Pune un nume, cel puțin un tip de masă, un ingredient și un pas.',
    saved: 'Rețetă salvată — planificatorul o poate folosi acum',
    remove: 'Scoate',
  },
});

interface Props {
  /** Edit this recipe (if it's yours) or start a copy of it (if it's built in). */
  recipe?: Recipe;
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export function RecipeEditor({ recipe, onClose, onToast }: Props) {
  const { dispatch } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const copying = !!recipe && !recipe.custom;
  const [name, setName] = useState(recipe ? (copying ? t.copyName(pick(recipe.name, lang)) : pick(recipe.name, lang)) : '');
  const [emoji, setEmoji] = useState(recipe?.emoji ?? '🍲');
  const [slots, setSlots] = useState<Slot[]>(recipe?.slots ?? ['lunch', 'dinner']);
  const [cuisine, setCuisine] = useState<Cuisine>(recipe?.cuisine ?? 'Romanian');
  const [minutes, setMinutes] = useState(recipe?.minutes ?? 30);
  const [active, setActive] = useState(recipe?.activeMinutes ?? 20);
  const [keepsDays, setKeepsDays] = useState(recipe?.keepsDays ?? 2);
  const [difficulty, setDifficulty] = useState<Difficulty>(recipe?.difficulty ?? 'easy');
  const [lines, setLines] = useState(recipe?.ingredients.map((l) => ({ ...l })) ?? []);
  const [extras, setExtras] = useState(recipe?.extras.map((x) => pick(x, lang)).join('\n') ?? '');
  const [steps, setSteps] = useState((recipe ? recipe.steps[lang] : []).join('\n'));
  const [tip, setTip] = useState(recipe?.tip ? pick(recipe.tip, lang) : '');
  const [query, setQuery] = useState('');
  const [newIngredient, setNewIngredient] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INGREDIENT_LIST.filter((i) => !lines.some((l) => l.id === i.id))
      .filter((i) => ingredientName(i, lang).toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, lines, lang]);

  const n = nutrientsOf(lines);
  const stepList = steps
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  const valid = name.trim() && slots.length && lines.length && stepList.length;

  const save = () => {
    if (!valid) return;
    const both = (x: string) => ({ en: x, ro: x });
    const out: Recipe = {
      id: recipe?.custom ? recipe.id : newId('my'),
      name: both(name.trim()),
      emoji,
      slots: SLOTS.filter((x) => slots.includes(x)),
      cuisine,
      minutes,
      activeMinutes: Math.min(active, minutes),
      difficulty,
      keepsDays,
      ingredients: lines.filter((l) => l.g > 0),
      extras: extras
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .map(both),
      steps: { en: stepList, ro: stepList },
      tip: tip.trim() ? both(tip.trim()) : undefined,
      custom: true,
    };
    dispatch({ type: 'saveRecipe', recipe: out });
    onToast?.(t.saved);
    onClose();
  };

  if (newIngredient)
    return (
      <IngredientEditor
        initialName={query}
        onClose={() => setNewIngredient(false)}
        onSaved={(ing) => {
          setLines((l) => [...l, { id: ing.id, g: 100 }]);
          setQuery('');
          setNewIngredient(false);
        }}
      />
    );

  return (
    <Sheet onClose={onClose} title={recipe?.custom ? t.editTitle : t.newTitle}>
      <div className="stack">
        <div className="field">
          <label htmlFor="r-name">{t.name}</label>
          <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.emoji}</label>
          <div className="row wrap" style={{ gap: 4 }}>
            {EMOJIS.map((e) => (
              <button key={e} className={`chip ${emoji === e ? 'on' : ''}`} style={{ padding: '4px 8px', fontSize: 18 }} onClick={() => setEmoji(e)} aria-pressed={emoji === e}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>{t.slots}</label>
          <Chips value={slots} options={SLOTS.map((x) => ({ value: x, label: c.slot[x] }))} onChange={setSlots} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="r-cuisine">{t.cuisine}</label>
            <select id="r-cuisine" className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value as Cuisine)}>
              {CUISINES.map((x) => (
                <option key={x} value={x}>
                  {c.cuisine[x]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t.difficulty}</label>
            <Seg value={difficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: c.difficulty[d] }))} onChange={setDifficulty} />
          </div>
        </div>
        <div className="grid3">
          <NumberField label={t.minutes} value={minutes} suffix="min" min={1} max={600} onChange={setMinutes} />
          <NumberField label={t.active} value={active} suffix="min" min={1} max={600} onChange={setActive} />
          <NumberField label={t.keeps} value={keepsDays} min={1} max={7} onChange={setKeepsDays} />
        </div>

        <div className="field">
          <label>{t.ingredients}</label>
          <div className="list">
            {lines.map((l, i) => {
              const ing = INGREDIENT_LIST.find((x) => x.id === l.id);
              return (
                <div key={l.id} className="item">
                  <span className="grow">{ing ? ingredientName(ing, lang) : l.id}</span>
                  <input
                    className="input"
                    style={{ width: 80 }}
                    inputMode="numeric"
                    aria-label={`${ing ? ingredientName(ing, lang) : l.id} g`}
                    value={l.g}
                    onChange={(e) => {
                      const g = Number(e.target.value.replace(',', '.'));
                      setLines((ls) => ls.map((x, j) => (j === i ? { ...x, g: Number.isFinite(g) ? g : 0 } : x)));
                    }}
                  />
                  <span className="muted small">g</span>
                  <button className="icon-btn" aria-label={t.remove} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                    <Icon name="x" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
          <input className="input" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
          {query.trim() && (
            <div className="card flat" style={{ padding: '4px 10px' }}>
              {matches.map((i) => (
                <button
                  key={i.id}
                  className="item"
                  style={{ border: 0, background: 'none', width: '100%', textAlign: 'left' }}
                  onClick={() => {
                    setLines((ls) => [...ls, { id: i.id, g: i.unit?.grams ?? 100 }]);
                    setQuery('');
                  }}
                >
                  <Icon name="plus" size={16} /> {ingredientName(i, lang)}
                  <span className="muted tiny">{i.per100.kcal} kcal/100 g</span>
                </button>
              ))}
              {!matches.length && <div className="muted small">{t.noMatch}</div>}
            </div>
          )}
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setNewIngredient(true)}>
            {t.newIng}
          </button>
        </div>

        <div className="callout ok small">{t.perServing(Math.round(n.kcal), Math.round(n.protein), Math.round(n.carbs), Math.round(n.fat))}</div>

        <div className="field">
          <label htmlFor="r-extras">{t.extras}</label>
          <textarea id="r-extras" className="input" rows={2} value={extras} onChange={(e) => setExtras(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="r-steps">{t.steps}</label>
          <textarea id="r-steps" className="input" rows={7} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="r-tip">{t.tip}</label>
          <input id="r-tip" className="input" value={tip} onChange={(e) => setTip(e.target.value)} />
        </div>

        {!valid && <div className="muted small">{t.need}</div>}
        <div className="row">
          <button className="btn grow" onClick={onClose}>
            {c.cancel}
          </button>
          <button className="btn primary grow" disabled={!valid} onClick={save}>
            {c.save}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

const I = texts({
  en: {
    title: 'Your own ingredient',
    name: 'Name',
    aisle: 'Shop aisle',
    per100: 'Nutrition per 100 g (from the pack label)',
    kind: 'What is it?',
    kinds: { plant: 'Plant-based', dairy: 'Dairy', egg: 'Egg', poultry: 'Poultry', 'red-meat': 'Beef / lamb', pork: 'Pork', fish: 'Fish', seafood: 'Seafood', honey: 'Honey' } as Record<FoodGroup, string>,
    allergens: 'Allergens',
    pack: 'Pack you buy',
    packGrams: 'Pack size',
    price: 'Price',
    shelf: 'Keeps after opening (days)',
    saved: 'Ingredient saved',
  },
  ro: {
    title: 'Ingredientul tău',
    name: 'Nume',
    aisle: 'Raionul din magazin',
    per100: 'Valori nutriționale la 100 g (de pe etichetă)',
    kind: 'Ce fel de ingredient e?',
    kinds: { plant: 'Vegetal', dairy: 'Lactat', egg: 'Ou', poultry: 'Pasăre', 'red-meat': 'Vită / miel', pork: 'Porc', fish: 'Pește', seafood: 'Fructe de mare', honey: 'Miere' },
    allergens: 'Alergeni',
    pack: 'Ambalajul pe care îl cumperi',
    packGrams: 'Mărime',
    price: 'Preț',
    shelf: 'Ține după deschidere (zile)',
    saved: 'Ingredient salvat',
  },
});

function IngredientEditor({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (i: Ingredient) => void }) {
  const { dispatch } = useStore();
  const { s } = useLang();
  const t = s(I);
  const c = s(COMMON);
  const [name, setName] = useState(initialName);
  const [aisle, setAisle] = useState<Aisle>('Produce');
  const [group, setGroup] = useState<FoodGroup>('plant');
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [per100, setPer100] = useState({ kcal: 100, protein: 5, carbs: 10, fat: 3, fiber: 1 });
  const [packGrams, setPackGrams] = useState(500);
  const [price, setPrice] = useState(10);
  const [shelfDays, setShelfDays] = useState(5);

  const save = () => {
    if (!name.trim()) return;
    const ing: Ingredient = {
      id: newId('my-ing'),
      name: name.trim(),
      nameRo: name.trim(),
      aisle,
      per100,
      group,
      allergens,
      pack: { grams: packGrams, price, label: `${packGrams} g` },
      shelfDays,
      custom: true,
    };
    dispatch({ type: 'saveIngredient', ingredient: ing });
    onSaved(ing);
  };

  return (
    <Sheet onClose={onClose} title={t.title}>
      <div className="stack">
        <div className="field">
          <label htmlFor="i-name">{t.name}</label>
          <input id="i-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="i-aisle">{t.aisle}</label>
            <select id="i-aisle" className="input" value={aisle} onChange={(e) => setAisle(e.target.value as Aisle)}>
              {AISLE_ORDER.map((a) => (
                <option key={a} value={a}>
                  {c.aisle[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="i-kind">{t.kind}</label>
            <select id="i-kind" className="input" value={group} onChange={(e) => setGroup(e.target.value as FoodGroup)}>
              {(Object.keys(t.kinds) as FoodGroup[]).map((g) => (
                <option key={g} value={g}>
                  {t.kinds[g]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>{t.per100}</label>
          <div className="grid3">
            {(['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
              <NumberField
                key={k}
                label={k === 'kcal' ? c.kcal : k === 'fiber' ? c.fibre : c[k]}
                value={per100[k]}
                min={0}
                max={k === 'kcal' ? 900 : 100}
                onChange={(v) => setPer100((x) => ({ ...x, [k]: v }))}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label>{t.allergens}</label>
          <Chips value={allergens} options={ALLERGENS.map((a) => ({ value: a.id, label: c.allergen[a.id] }))} onChange={setAllergens} bad />
        </div>
        <div className="field">
          <label>{t.pack}</label>
          <div className="grid3">
            <NumberField label={t.packGrams} value={packGrams} suffix="g" min={1} max={20000} onChange={setPackGrams} />
            <NumberField label={t.price} value={price} suffix="lei" min={0} max={2000} onChange={setPrice} />
            <NumberField label={t.shelf} value={shelfDays} min={1} max={365} onChange={setShelfDays} />
          </div>
        </div>
        <div className="row">
          <button className="btn grow" onClick={onClose}>
            {c.cancel}
          </button>
          <button className="btn primary grow" disabled={!name.trim()} onClick={save}>
            {c.save}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
