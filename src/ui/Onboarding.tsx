import { useState } from 'react';
import type { Cuisine, Profile } from '../data/types';
import { DEFAULT_PROFILE } from '../engine/defaults';
import { generatePlan } from '../engine/planner';
import { texts } from '../i18n';
import { useLang, useStore } from '../state/store';
import { CuisineSwipe } from './CuisineSwipe';
import { LangSwitch } from './LangSwitch';
import { BodySection, DietSection, GoalSection, HouseholdSection, MealsSection, TargetsSection, type SectionProps } from './ProfileSections';

const T = texts({
  en: {
    steps: [
      ["What's the goal?", 'This sets your calorie target.'],
      ['About you', 'Used only to compute your targets. Stays on this device.'],
      ['Your daily targets', 'Every day of your plan is checked against these — not just the weekly average.'],
      ['How do you eat?', 'Anything you rule out here never shows up.'],
      ['Your meals', 'Pick the meals to plan and how much cooking you want to do.'],
      ['Household & budget', 'The shopping list buys for everyone at the table.'],
    ],
    heroTitle: 'A week of meals that actually adds up',
    heroText:
      'Tell us your goal, diet and budget. WeekPlate builds seven days of meals where every single day hits your protein and calories, then hands you one aisle-sorted shopping list in real pack sizes and real store prices.',
    start: 'Get started',
    demo: 'Skip — show me a sample week',
    building: 'Building your week…',
    footer: 'Nutrition from USDA FoodData Central · shelf prices from Monitorul Prețurilor',
    back: 'Back',
    next: 'Continue',
    build: 'Build my week',
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
  },
  ro: {
    steps: [
      ['Care e obiectivul?', 'De aici pornește ținta de calorii.'],
      ['Despre tine', 'Folosim datele doar ca să-ți calculăm țintele. Rămân pe acest dispozitiv.'],
      ['Țintele tale zilnice', 'Fiecare zi din plan e verificată după ele — nu doar media săptămânii.'],
      ['Cum mănânci?', 'Ce excluzi aici nu apare niciodată.'],
      ['Mesele tale', 'Alege ce mese planificăm și cât vrei să gătești.'],
      ['Familie și buget', 'Lista de cumpărături ia pentru toată lumea de la masă.'],
    ],
    heroTitle: 'O săptămână de mese care chiar se leagă',
    heroText:
      'Spune-ne obiectivul, dieta și bugetul. WeekPlate face șapte zile de mese în care fiecare zi își atinge proteinele și caloriile, apoi îți dă o singură listă de cumpărături, pe raioane, cu ambalaje și prețuri reale din magazine.',
    start: 'Să începem',
    demo: 'Sari peste — arată-mi o săptămână exemplu',
    building: 'Îți construim săptămâna…',
    footer: 'Valori nutriționale USDA FoodData Central · prețuri de raft din Monitorul Prețurilor',
    back: 'Înapoi',
    next: 'Continuă',
    build: 'Construiește săptămâna',
    stepOf: (i: number, n: number) => `Pasul ${i} din ${n}`,
  },
});

const BODIES: ((p: SectionProps) => React.JSX.Element)[] = [GoalSection, BodySection, TargetsSection, DietSection, MealsSection, HouseholdSection];

export function Onboarding() {
  const { dispatch } = useStore();
  const { s } = useLang();
  const t = s(T);
  const [step, setStep] = useState(-1);
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const [busy, setBusy] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  const finish = (cuisines: Cuisine[] = []) => {
    setSwiping(false);
    setBusy(true);
    // Let the button repaint before the (≈100 ms) planning run.
    setTimeout(() => dispatch({ type: 'setBoth', profile: p, plan: generatePlan(p, Date.now(), cuisines) }), 30);
  };

  if (swiping) return <CuisineSwipe profile={p} onDone={finish} onSkip={() => finish()} onClose={() => setSwiping(false)} />;

  if (step < 0)
    return (
      <div className="app">
        <div className="row" style={{ justifyContent: 'flex-end', paddingTop: 14 }}>
          <LangSwitch />
        </div>
        <div className="hero stack" style={{ alignItems: 'center', gap: 14 }}>
          <div className="plate">🍽️</div>
          <h1>{t.heroTitle}</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 420 }}>
            {t.heroText}
          </p>
          <div className="stack" style={{ width: '100%', maxWidth: 360, marginTop: 10 }}>
            <button className="btn primary block" onClick={() => setStep(0)}>
              {t.start}
            </button>
            <button className="btn ghost block" onClick={() => finish()} disabled={busy}>
              {busy ? t.building : t.demo}
            </button>
          </div>
          <p className="muted tiny">{t.footer}</p>
        </div>
      </div>
    );

  const [title, sub] = t.steps[step];
  const Body = BODIES[step];
  const last = step === BODIES.length - 1;
  return (
    <div className="app">
      <div className="wizard">
        <div className="steps-dots" aria-label={t.stepOf(step + 1, BODIES.length)}>
          {BODIES.map((_, i) => (
            <i key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <div>
          <h1>{title}</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {sub}
          </p>
        </div>
        <Body p={p} set={set} />
        <div className="wizard-foot">
          <button className="btn" onClick={() => setStep(step - 1)}>
            {t.back}
          </button>
          <button className="btn primary grow" onClick={last ? () => setSwiping(true) : () => setStep(step + 1)} disabled={busy}>
            {busy ? t.building : last ? t.build : t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
