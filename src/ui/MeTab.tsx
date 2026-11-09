import { useState } from 'react';
import type { Profile } from '../data/types';
import { INGREDIENTS } from '../data/ingredients';
import { PRICE_SOURCE } from '../data/prices';
import { RECIPE_MAP } from '../data/recipes';
import { generatePlan, reconcile, setStartDay } from '../engine/planner';
import { texts } from '../i18n';
import { ingredientName, recipeName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { Icon } from './kit';
import { SupportSection } from './SupportSection';
import { LangSwitch } from './LangSwitch';
import { BodySection, DietSection, GoalSection, HouseholdSection, MealsSection, TargetsSection, type SectionProps } from './ProfileSections';

const T = texts({
  en: {
    sections: {
      targets: 'Daily targets',
      goal: 'Goal',
      body: 'Body & activity',
      diet: 'Diet & allergies',
      meals: 'Meals, soups, cuisines & cooking',
      household: 'Household, budget & days',
    },
    language: 'Language',
    never: 'Never show me',
    toastNew: 'Saved — fresh week built',
    toastKeep: 'Saved — only meals that no longer fit were re-planned',
    unsaved: 'You have unsaved changes',
    saveKeep: 'Save & adjust this week',
    saveNew: 'Save & new week',
    discard: 'Discard',
    about: 'About WeekPlate',
    aboutText: (date: string, where: string) =>
      `Nutrition comes from one USDA FoodData Central record per ingredient (SR Legacy); a few, like skyr and telemea, use the closest record. Prices are shelf prices that Kaufland, Lidl, Carrefour, Mega Image and Selgros report to Monitorul Prețurilor (Consiliul Concurenței), fetched ${date} near ${where}. Everything you enter is stored only on this device.`,
    reset: 'Reset app',
    confirmReset: 'Erase your profile, plan and your own recipes from this device?',
  },
  ro: {
    sections: {
      targets: 'Ținte zilnice',
      goal: 'Obiectiv',
      body: 'Corp și activitate',
      diet: 'Dietă și alergii',
      meals: 'Mese, ciorbe, bucătării și gătit',
      household: 'Familie, buget și zile',
    },
    language: 'Limbă',
    never: 'Nu-mi arăta niciodată',
    toastNew: 'Salvat — săptămână nouă',
    toastKeep: 'Salvat — doar mesele care nu se mai potriveau au fost replanificate',
    unsaved: 'Ai modificări nesalvate',
    saveKeep: 'Salvează și ajustează săptămâna',
    saveNew: 'Salvează și fă săptămână nouă',
    discard: 'Renunță',
    about: 'Despre WeekPlate',
    aboutText: (date: string, where: string) =>
      `Valorile nutriționale vin dintr-o singură înregistrare USDA FoodData Central pe ingredient (SR Legacy); câteva, ca skyr-ul și telemeaua, folosesc cea mai apropiată înregistrare. Prețurile sunt prețurile de raft pe care Kaufland, Lidl, Carrefour, Mega Image și Selgros le raportează la Monitorul Prețurilor (Consiliul Concurenței), preluate pe ${date} lângă ${where}. Tot ce introduci rămâne doar pe acest dispozitiv.`,
    reset: 'Resetează aplicația',
    confirmReset: 'Ștergi profilul, planul și rețetele tale de pe acest dispozitiv?',
  },
});

type Key = keyof (typeof T)['en']['sections'];

const SECTIONS: { key: Key; Body: (p: SectionProps) => React.JSX.Element }[] = [
  { key: 'targets', Body: TargetsSection },
  { key: 'goal', Body: GoalSection },
  { key: 'body', Body: BodySection },
  { key: 'diet', Body: DietSection },
  { key: 'meals', Body: MealsSection },
  { key: 'household', Body: HouseholdSection },
];

export function MeTab({ toast }: { toast: (m: string) => void }) {
  const { state, dispatch } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const saved = state.profile!;
  const [p, setP] = useState<Profile>(saved);
  const [openKey, setOpenKey] = useState<Key | null>('targets');
  const dirty = JSON.stringify(p) !== JSON.stringify(saved);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  const save = (mode: 'keep' | 'new') => {
    let plan = state.plan!;
    if (mode === 'new') plan = generatePlan(p, Date.now(), plan.cuisines ?? [], plan.useUp ?? []);
    else {
      if (p.startDay !== saved.startDay) plan = setStartDay(plan, p.startDay);
      plan = reconcile(plan, p);
    }
    dispatch({ type: 'setBoth', profile: p, plan });
    toast(mode === 'new' ? t.toastNew : t.toastKeep);
  };

  return (
    <div className="stack">
      <div className="card spread">
        <h3>{t.language}</h3>
        <LangSwitch />
      </div>

      {SECTIONS.map(({ key, Body }) => (
        <div key={key} className="card">
          <button className="spread" style={{ width: '100%', border: 0, background: 'none', padding: 0 }} onClick={() => setOpenKey(openKey === key ? null : key)} aria-expanded={openKey === key}>
            <h3>{t.sections[key]}</h3>
            <span className="muted">{openKey === key ? '−' : '+'}</span>
          </button>
          {openKey === key && (
            <div style={{ marginTop: 12 }}>
              <Body p={p} set={set} />
            </div>
          )}
        </div>
      ))}

      {(p.dislikes.length > 0 || p.bannedRecipes.length > 0) && (
        <div className="card">
          <h3>{t.never}</h3>
          <div className="row wrap" style={{ marginTop: 8 }}>
            {p.dislikes.map((id) => (
              <button key={id} className="chip bad on" onClick={() => set({ dislikes: p.dislikes.filter((x) => x !== id) })}>
                {INGREDIENTS[id] ? ingredientName(INGREDIENTS[id], lang) : id} ✕
              </button>
            ))}
            {p.bannedRecipes.map((id) => (
              <button key={id} className="chip bad on" onClick={() => set({ bannedRecipes: p.bannedRecipes.filter((x) => x !== id) })}>
                {RECIPE_MAP[id] ? recipeName(RECIPE_MAP[id], lang) : id} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      {dirty && (
        <div className="card stack" style={{ position: 'sticky', bottom: 'calc(80px + env(safe-area-inset-bottom))', gap: 8 }}>
          <b>{t.unsaved}</b>
          <div className="row">
            <button className="btn primary grow" onClick={() => save('keep')}>
              {t.saveKeep}
            </button>
            <button className="btn grow" onClick={() => save('new')}>
              {t.saveNew}
            </button>
          </div>
          <button className="btn ghost sm" onClick={() => setP(saved)}>
            {t.discard}
          </button>
        </div>
      )}

      <SupportSection />

      <div className="card">
        <h3>{t.about}</h3>
        <p className="muted small">{t.aboutText(PRICE_SOURCE.fetchedAt, PRICE_SOURCE.location)}</p>
        <button
          className="btn danger sm"
          onClick={() => {
            if (confirm(t.confirmReset)) dispatch({ type: 'reset' });
          }}
        >
          <Icon name="x" size={16} /> {t.reset}
        </button>
      </div>
    </div>
  );
}
