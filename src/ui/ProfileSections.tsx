import { chainName, CHAIN_IDS, PRICE_SOURCE } from '../data/prices';
import { ALLERGENS, CUISINES, DIFFICULTIES, SLOTS, type Diet, type Exclusion, type Profile, type Repetition } from '../data/types';
import { emptySlots, runLength, slotPool } from '../engine/planner';
import { ACTIVITY_LEVELS, computeTargets, GOALS, type TargetStep } from '../engine/targets';
import { enPlural, roPlural, texts, type Lang } from '../i18n';
import { COMMON } from '../i18n/common';
import { useLang } from '../state/store';
import { Chips, Icon, NumberField, Seg } from './kit';

export interface SectionProps {
  p: Profile;
  set: (patch: Partial<Profile>) => void;
}

const fmt = (x: number, lang: Lang, digits = 0) => x.toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: digits });

const T = texts({
  en: {
    female: 'Female',
    male: 'Male',
    age: 'Age',
    height: 'Height',
    weight: 'Weight',
    howActive: 'How active are you?',
    kcalDay: 'Calories / day',
    band: (a: number, b: number) => `±5 % band: ${a}–${b}`,
    proteinDay: 'Protein floor / day',
    everyDay: 'every day must clear it',
    howGot: 'How we got these numbers',
    own: 'Use my own numbers (e.g. from a dietitian)',
    kcalLabel: 'Calories',
    proteinLabel: 'Protein',
    step: {
      bmr: ['Base burn (Mifflin–St Jeor)', (v: { w: number; h: number; age: number; sexConst: number }) => `10 × ${v.w} kg + 6.25 × ${v.h} cm − 5 × ${v.age} y ${v.sexConst > 0 ? '+ 5' : '− 161'}`],
      tdee: ['Daily burn', (v: { bmr: number; activity: number }) => `${Math.round(v.bmr)} × ${v.activity} activity`],
      goal: ['Goal adjustment', (v: { tdee: number; factor: number }) => `${Math.round(v.tdee)} × ${v.factor} (${v.factor < 1 ? '−20 %' : v.factor > 1 ? '+10 %' : 'no change'}), to the nearest 50`],
      kcalFloor: ['Raised to the minimum', (v: { floor: number }) => `we don’t plan below ${v.floor} kcal without a professional`],
      proteinWeight: ['Weight used for protein', (v: { w: number; bmi25: number }) => `lower of your ${v.w} kg and ${v.bmi25.toFixed(1)} kg (BMI 25 at your height)`],
      protein: ['Protein', (v: { lb: number; rate: number }) => `${v.lb.toFixed(1)} lb × ${v.rate} g/lb (≈ ${(v.rate * 2.20462).toFixed(1)} g/kg), to the nearest 5`],
      proteinFloor: ['Raised to the floor', (v: { lose: boolean; kg: number }) => (v.lose ? `0.8 g/lb of ${v.kg.toFixed(1)} kg` : `1.2 g/kg × ${v.kg} kg`)],
      proteinCeiling: ['Ceiling: 35 % of calories', (v: { kcal: number }) => `0.35 × ${v.kcal} kcal ÷ 4 kcal/g`],
    },
    leaveOut: 'Leave out',
    allergies: 'Allergies — these never appear (all 14 EU allergens)',
    lowCarb: 'Low-carb',
    halal: 'Halal-friendly',
    whichMeals: 'Which meals should we plan?',
    soupHint: 'Soup = a ciorbă or soup course before lunch. One pot is cooked every ~3 days and served as a smaller bowl.',
    emptySlot: (list: string, n: number) => `No recipe fits your filters for ${list} — ${n > 1 ? 'they' : 'it'} will be left out.`,
    cuisines: 'Cuisines you always like (optional — each week you can also swipe for that week’s cuisines)',
    maxTime: 'Longest weekday cook',
    any: 'Any',
    weekend: 'Longer cooks at the weekend',
    weekendHint: 'Braises, sarmale and other slow dishes (up to ~5 h) on Saturday or Sunday; leftovers carry into the week.',
    skill: 'Recipes up to',
    skillHint: 'Hard = dough, long braises and multi-stage dishes.',
    repetition: 'How much repetition is OK?',
    dishesFor: (d: number, m: number) => [`~${enPlural(d, 'dish', 'dishes')}`, `for ${m} meals`],
    whoElse: 'Who else eats with you?',
    person: (n: number) => `Person ${n}`,
    remove: 'Remove',
    addPerson: 'Add a person',
    standardHint: 'They get standard portions; only your portion is tuned to your targets.',
    share: 'Meals you share',
    shop: 'Where do you shop?',
    mix: 'Cheapest mix',
    shopHint: (where: string) => `Real shelf prices from the stores near ${where}. You can compare all of them on the Shop tab.`,
    budget: 'Weekly grocery budget',
    days: 'Days to plan',
    start: 'Week starts on',
    portions: ['Child', 'Adult', 'Big eater'],
  },
  ro: {
    female: 'Femeie',
    male: 'Bărbat',
    age: 'Vârstă',
    height: 'Înălțime',
    weight: 'Greutate',
    howActive: 'Cât de activ ești?',
    kcalDay: 'Calorii / zi',
    band: (a: number, b: number) => `interval ±5 %: ${a}–${b}`,
    proteinDay: 'Minim de proteine / zi',
    everyDay: 'fiecare zi trebuie să-l atingă',
    howGot: 'Cum am ajuns la cifrele astea',
    own: 'Folosesc cifrele mele (de ex. de la nutriționist)',
    kcalLabel: 'Calorii',
    proteinLabel: 'Proteine',
    step: {
      bmr: ['Metabolism bazal (Mifflin–St Jeor)', (v: { w: number; h: number; age: number; sexConst: number }) => `10 × ${v.w} kg + 6,25 × ${v.h} cm − 5 × ${v.age} ani ${v.sexConst > 0 ? '+ 5' : '− 161'}`],
      tdee: ['Consum zilnic', (v: { bmr: number; activity: number }) => `${Math.round(v.bmr)} × ${String(v.activity).replace('.', ',')} (activitate)`],
      goal: ['Ajustare după obiectiv', (v: { tdee: number; factor: number }) => `${Math.round(v.tdee)} × ${String(v.factor).replace('.', ',')} (${v.factor < 1 ? '−20 %' : v.factor > 1 ? '+10 %' : 'fără schimbare'}), rotunjit la 50`],
      kcalFloor: ['Ridicat la minim', (v: { floor: number }) => `nu planificăm sub ${v.floor} kcal fără un specialist`],
      proteinWeight: ['Greutatea folosită pentru proteine', (v: { w: number; bmi25: number }) => `cea mai mică dintre ${v.w} kg și ${v.bmi25.toFixed(1).replace('.', ',')} kg (IMC 25 la înălțimea ta)`],
      protein: ['Proteine', (v: { lb: number; rate: number }) => `${v.lb.toFixed(1).replace('.', ',')} lb × ${String(v.rate).replace('.', ',')} g/lb (≈ ${(v.rate * 2.20462).toFixed(1).replace('.', ',')} g/kg), rotunjit la 5`],
      proteinFloor: ['Ridicat la minim', (v: { lose: boolean; kg: number }) => (v.lose ? `0,8 g/lb din ${v.kg.toFixed(1).replace('.', ',')} kg` : `1,2 g/kg × ${v.kg} kg`)],
      proteinCeiling: ['Plafon: 35 % din calorii', (v: { kcal: number }) => `0,35 × ${v.kcal} kcal ÷ 4 kcal/g`],
    },
    leaveOut: 'Fără',
    allergies: 'Alergii — nu apar niciodată (toți cei 14 alergeni din UE)',
    lowCarb: 'Puțini carbohidrați',
    halal: 'Compatibil halal',
    whichMeals: 'Ce mese să planificăm?',
    soupHint: 'Ciorbă / supă = felul întâi, înainte de prânz. Se gătește o oală la ~3 zile și se servește un bol mai mic.',
    emptySlot: (list: string, n: number) => `Nicio rețetă nu se potrivește filtrelor pentru ${list} — ${n > 1 ? 'vor fi lăsate' : 'va fi lăsată'} deoparte.`,
    cuisines: 'Bucătării care îți plac mereu (opțional — în fiecare săptămână poți alege prin carduri)',
    maxTime: 'Timp maxim de gătit în timpul săptămânii',
    any: 'Oricât',
    weekend: 'Gătit mai lung în weekend',
    weekendHint: 'Tocănițe, sarmale și alte feluri lente (până la ~5 h) sâmbăta sau duminica; ce rămâne merge în timpul săptămânii.',
    skill: 'Rețete până la nivelul',
    skillHint: 'Greu = aluat, tocănițe lungi și feluri în mai multe etape.',
    repetition: 'Cât de des pot să se repete felurile?',
    dishesFor: (d: number, m: number) => [`~${roPlural(d, 'fel', 'feluri')}`, `pentru ${roPlural(m, 'masă', 'mese')}`],
    whoElse: 'Cine mai mănâncă cu tine?',
    person: (n: number) => `Persoana ${n}`,
    remove: 'Scoate',
    addPerson: 'Adaugă o persoană',
    standardHint: 'Ei primesc porții standard; doar porția ta e potrivită țintelor tale.',
    share: 'Mese pe care le mâncați împreună',
    shop: 'De unde cumperi?',
    mix: 'Cel mai ieftin mix',
    shopHint: (where: string) => `Prețuri reale de raft de la magazinele din zona ${where}. Le poți compara pe toate în tabul Cumpărături.`,
    budget: 'Buget săptămânal de cumpărături',
    days: 'Zile de planificat',
    start: 'Săptămâna începe',
    portions: ['Copil', 'Adult', 'Mănâncă mult'],
  },
});

const GOAL_EMOJI = { lose: '🔥', maintain: '⚖️', gain: '💪' };

export function GoalSection({ p, set }: SectionProps) {
  const { s } = useLang();
  const c = s(COMMON);
  return (
    <div className="stack">
      {GOALS.map((g) => (
        <button key={g} className={`choice ${p.goal === g ? 'on' : ''}`} onClick={() => set({ goal: g })}>
          <span className="emoji">{GOAL_EMOJI[g]}</span>
          <span className="grow">
            <b>{c.goal[g]}</b>
            <div className="muted small">{c.goalHint[g]}</div>
          </span>
        </button>
      ))}
    </div>
  );
}

export function BodySection({ p, set }: SectionProps) {
  const { s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  return (
    <div className="stack">
      <Seg
        value={p.sex}
        options={[
          { value: 'female', label: t.female },
          { value: 'male', label: t.male },
        ]}
        onChange={(sex) => set({ sex })}
      />
      <div className="grid3">
        <NumberField label={t.age} value={p.age} suffix={s({ en: 'y', ro: 'ani' })} min={16} max={99} onChange={(age) => set({ age })} />
        <NumberField label={t.height} value={p.heightCm} suffix="cm" min={120} max={230} onChange={(heightCm) => set({ heightCm })} />
        <NumberField label={t.weight} value={p.weightKg} suffix="kg" min={35} max={250} onChange={(weightKg) => set({ weightKg })} />
      </div>
      <div className="field">
        <label>{t.howActive}</label>
        <div className="stack" style={{ gap: 8 }}>
          {ACTIVITY_LEVELS.map((a, i) => (
            <button key={a} className={`choice ${p.activity === a ? 'on' : ''}`} style={{ padding: '9px 12px' }} onClick={() => set({ activity: a })}>
              <span className="grow">
                <b>{c.activity[i]}</b> <span className="muted small">· {c.activityHint[i]}</span>
              </span>
              <span className="muted small">×{a}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function stepText(step: TargetStep, t: (typeof T)['en']): [string, string] {
  // Each entry pairs a label with a formatter for that step's numbers.
  const [label, math] = t.step[step.key] as [string, (v: unknown) => string];
  return [label, math(step.v)];
}

export function TargetsSection({ p, set }: SectionProps) {
  const { lang, s } = useLang();
  const t = s(T);
  const tg = computeTargets({ ...p, customTargets: null });
  const custom = p.customTargets;
  const kcal = custom?.kcal ?? tg.kcal;
  const unit = (step: TargetStep) => (step.key === 'proteinWeight' ? 'kg' : step.key.startsWith('protein') ? 'g' : 'kcal');
  return (
    <div className="stack">
      <div className="grid2">
        <div className="card flat">
          <div className="muted small">{t.kcalDay}</div>
          <div className="big-num">{kcal}</div>
          <div className="muted tiny">{t.band(Math.round(kcal * 0.95), Math.round(kcal * 1.05))}</div>
        </div>
        <div className="card flat">
          <div className="muted small">{t.proteinDay}</div>
          <div className="big-num">{custom?.protein ?? tg.protein} g</div>
          <div className="muted tiny">{t.everyDay}</div>
        </div>
      </div>

      <details className="card flat" open={!custom}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t.howGot}</summary>
        <table className="math" style={{ marginTop: 8 }}>
          <tbody>
            {tg.steps.map((step) => {
              const [label, math] = stepText(step, t);
              return (
                <tr key={step.key}>
                  <td>
                    <b>{label}</b>
                    <div className="muted tiny">{math}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {fmt(step.result, lang, unit(step) === 'kg' ? 1 : 0)} {unit(step)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>

      <label className="row" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={!!custom} onChange={(e) => set({ customTargets: e.target.checked ? { kcal: tg.kcal, protein: tg.protein } : null })} />
        <span>{t.own}</span>
      </label>
      {custom && (
        <div className="grid2">
          <NumberField label={t.kcalLabel} value={custom.kcal} suffix="kcal" min={1000} max={5000} onChange={(k) => set({ customTargets: { ...custom, kcal: k } })} />
          <NumberField label={t.proteinLabel} value={custom.protein} suffix="g" min={30} max={350} onChange={(protein) => set({ customTargets: { ...custom, protein } })} />
        </div>
      )}
    </div>
  );
}

const EXCLUSIONS: Exclusion[] = ['pork', 'red-meat', 'gluten', 'dairy', 'egg', 'nuts'];

export function DietSection({ p, set }: SectionProps) {
  const { s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  return (
    <div className="stack">
      <Seg<Diet> value={p.diet} options={(['omnivore', 'pescatarian', 'vegetarian', 'vegan'] as Diet[]).map((d) => ({ value: d, label: c.diet[d] }))} onChange={(diet) => set({ diet })} />
      <div className="row wrap">
        <button className={`chip ${p.lowCarb ? 'on' : ''}`} onClick={() => set({ lowCarb: !p.lowCarb })}>
          {t.lowCarb}
        </button>
        <button className={`chip ${p.halal ? 'on' : ''}`} onClick={() => set({ halal: !p.halal })}>
          {t.halal}
        </button>
      </div>
      <div className="field">
        <label>{t.leaveOut}</label>
        <Chips value={p.exclude} options={EXCLUSIONS.map((x) => ({ value: x, label: c.exclusion[x] }))} onChange={(exclude) => set({ exclude })} bad />
      </div>
      <div className="field">
        <label>{t.allergies}</label>
        <Chips value={p.allergens} options={ALLERGENS.map((a) => ({ value: a.id, label: c.allergen[a.id] }))} onChange={(allergens) => set({ allergens })} bad />
      </div>
    </div>
  );
}

const REP_EMOJI: Record<Repetition, string> = { variety: '🎨', balanced: '⚖️', mealprep: '📦' };

export function MealsSection({ p, set }: SectionProps) {
  const { s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const empty = emptySlots(p);
  const mealsPerWeek = p.slots.length * p.days;
  return (
    <div className="stack">
      <div className="field">
        <label>{t.whichMeals}</label>
        <Chips value={p.slots} options={SLOTS.map((x) => ({ value: x, label: c.slot[x] }))} onChange={(slots) => slots.length && set({ slots: SLOTS.filter((x) => slots.includes(x)) })} />
        {p.slots.includes('soup') && <div className="muted tiny">{t.soupHint}</div>}
        {empty.length > 0 && <div className="callout small">{t.emptySlot(empty.map((x) => c.slotLower[x]).join(', '), empty.length)}</div>}
      </div>
      <div className="field">
        <label>{t.cuisines}</label>
        <Chips value={p.cuisines} options={CUISINES.map((x) => ({ value: x, label: c.cuisine[x] }))} onChange={(cuisines) => set({ cuisines })} />
      </div>
      <div className="field">
        <label>{t.maxTime}</label>
        <Seg
          value={p.maxMinutes}
          options={[15, 30, 45, 60].map((m) => ({ value: m, label: c.minutes(m) })).concat([{ value: 999, label: t.any }])}
          onChange={(maxMinutes) => set({ maxMinutes })}
        />
        <label className="row small" style={{ cursor: 'pointer', marginTop: 6 }}>
          <input type="checkbox" checked={p.weekendCooking} onChange={(e) => set({ weekendCooking: e.target.checked })} />
          <span>
            <b>{t.weekend}</b> <span className="muted">— {t.weekendHint}</span>
          </span>
        </label>
      </div>
      <div className="field">
        <label>{t.skill}</label>
        <Seg value={p.skill} options={DIFFICULTIES.map((d) => ({ value: d, label: c.difficulty[d] }))} onChange={(skill) => set({ skill })} />
        <div className="muted tiny">{t.skillHint}</div>
      </div>
      <div className="field">
        <label>{t.repetition}</label>
        <div className="stack" style={{ gap: 8 }}>
          {(['variety', 'balanced', 'mealprep'] as Repetition[]).map((r) => {
            const dishes = p.slots.reduce((sum, slot) => sum + Math.min(slotPool(p, slot).length, Math.ceil(p.days / runLength({ ...p, repetition: r }, slot))), 0);
            const [a, b] = t.dishesFor(dishes, mealsPerWeek);
            return (
              <button key={r} className={`choice ${p.repetition === r ? 'on' : ''}`} onClick={() => set({ repetition: r })}>
                <span className="emoji">{REP_EMOJI[r]}</span>
                <span className="grow">
                  <b>{c.repetition[r]}</b>
                  <div className="muted small">{c.repetitionHint[r]}</div>
                </span>
                <span className="muted tiny" style={{ textAlign: 'right' }}>
                  {a}
                  <br />
                  {b}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const PORTIONS = [0.6, 1, 1.3];

export function HouseholdSection({ p, set }: SectionProps) {
  const { s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const others = p.household;
  return (
    <div className="stack">
      <div className="field">
        <label>{t.whoElse}</label>
        <div className="stack" style={{ gap: 8 }}>
          {others.map((m, i) => (
            <div key={m.id} className="row">
              <input className="input grow" value={m.name} aria-label={t.person(i + 2)} onChange={(e) => set({ household: others.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <select
                className="input"
                style={{ width: 'auto' }}
                value={m.factor}
                aria-label={t.portions.join(' / ')}
                onChange={(e) => set({ household: others.map((x, j) => (j === i ? { ...x, factor: Number(e.target.value) } : x)) })}
              >
                {PORTIONS.map((v, k) => (
                  <option key={v} value={v}>
                    {t.portions[k]} ({v}×)
                  </option>
                ))}
              </select>
              <button className="icon-btn" aria-label={t.remove} onClick={() => set({ household: others.filter((_, j) => j !== i) })}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
          <button
            className="btn sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => set({ household: [...others, { id: crypto.randomUUID(), name: t.person(others.length + 2), factor: 1 }] })}
          >
            <Icon name="plus" size={16} /> {t.addPerson}
          </button>
        </div>
        <div className="muted tiny">{t.standardHint}</div>
      </div>
      {others.length > 0 && (
        <div className="field">
          <label>{t.share}</label>
          <Chips value={p.householdSlots} options={SLOTS.map((x) => ({ value: x, label: c.slot[x] }))} onChange={(householdSlots) => set({ householdSlots })} />
        </div>
      )}
      <div className="field">
        <label>{t.shop}</label>
        <Chips
          value={[p.store]}
          options={[...CHAIN_IDS, 'mix' as const].map((x) => ({ value: x, label: x === 'mix' ? t.mix : chainName(x) }))}
          onChange={(v) => {
            const next = v.find((x) => x !== p.store);
            if (next) set({ store: next });
          }}
        />
        <div className="muted tiny">{t.shopHint(PRICE_SOURCE.location)}</div>
      </div>
      <div className="grid2">
        <NumberField label={t.budget} value={p.budget} suffix="lei" min={0} max={10000} onChange={(budget) => set({ budget })} />
        <div className="field">
          <label>{t.days}</label>
          <Seg value={p.days} options={[5, 6, 7].map((d) => ({ value: d, label: String(d) }))} onChange={(days) => set({ days })} />
        </div>
      </div>
      <div className="field">
        <label>{t.start}</label>
        <Seg value={p.startDay} options={c.days.map((d, i) => ({ value: i, label: d }))} onChange={(startDay) => set({ startDay })} />
      </div>
    </div>
  );
}
