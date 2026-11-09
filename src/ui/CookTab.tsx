import { useMemo, useState } from 'react';
import { cookSessions, type CookSession } from '../engine/cooking';
import { enPlural, roPlural, texts } from '../i18n';
import { COMMON, dayLabel, recipeName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { Icon } from './kit';
import { RecipeSheet } from './RecipeSheet';

const T = texts({
  en: {
    times: 'times you cook',
    covered: 'meals covered',
    kitchen: 'hands-on time',
    batches: (n: number) => `${enPlural(n, 'dish is', 'dishes are')} batch-cooked: cook once, box up the rest. Leftovers are always eaten within the days the dish keeps.`,
    covers: (list: string) => `Covers ${list}`,
    handsOn: (a: number, total: number) => (total > a ? `${a}′ hands-on · ${total}′ total` : `${a}′`),
    meals: (n: number) => `×${n} meals`,
  },
  ro: {
    times: 'sesiuni de gătit',
    covered: 'mese acoperite',
    kitchen: 'timp efectiv la bucătărie',
    batches: (n: number) =>
      `${roPlural(n, 'fel se gătește', 'feluri se gătesc')} la grămadă: gătești o dată, pui restul la cutie. Resturile se mănâncă mereu cât timp ține felul în frigider.`,
    covers: (list: string) => `Acoperă ${list}`,
    handsOn: (a: number, total: number) => (total > a ? `${a}′ efectiv · ${total}′ total` : `${a}′`),
    meals: (n: number) => `×${n} mese`,
  },
});

export function CookTab({ toast }: { toast: (m: string) => void }) {
  const { week } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const days = week!;
  const sessions = useMemo(() => cookSessions(days), [days]);
  const [open, setOpen] = useState<CookSession | null>(null);

  const activeMin = sessions.reduce((sum, x) => sum + x.recipe.activeMinutes, 0);
  const meals = sessions.reduce((sum, x) => sum + x.meals.length, 0);
  const batches = sessions.filter((x) => x.meals.length > 1);

  return (
    <div className="stack">
      <div className="card">
        <div className="grid3" style={{ textAlign: 'center' }}>
          <div>
            <div className="big-num">{sessions.length}</div>
            <div className="muted small">{t.times}</div>
          </div>
          <div>
            <div className="big-num">{meals}</div>
            <div className="muted small">{t.covered}</div>
          </div>
          <div>
            <div className="big-num">{c.hours(Math.round((activeMin / 60) * 10) / 10)}</div>
            <div className="muted small">{t.kitchen}</div>
          </div>
        </div>
        {batches.length > 0 && (
          <p className="muted small" style={{ margin: '10px 0 0' }}>
            {t.batches(batches.length)}
          </p>
        )}
      </div>

      {days.map((d) => {
        const today = sessions.filter((x) => x.dayIndex === d.index);
        if (!today.length) return null;
        return (
          <div key={d.index}>
            <div className="section-title">
              {dayLabel(d.date, lang, true)} · {c.minutes(today.reduce((sum, x) => sum + x.recipe.activeMinutes, 0))}
            </div>
            <div className="card list" style={{ padding: '2px 14px' }}>
              {today.map((x) => (
                <button key={`${x.recipe.id}-${x.dayIndex}`} className="item" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={() => setOpen(x)}>
                  <span style={{ fontSize: 26 }}>{x.recipe.emoji}</span>
                  <span className="grow">
                    <b>{recipeName(x.recipe, lang)}</b>
                    <div className="muted small">
                      {x.meals.length > 1 ? t.covers(x.meals.map((m) => `${dayLabel(days[m.dayIndex].date, lang)} ${c.slotLower[m.slot]}`).join(', ')) : c.slot[x.meals[0].slot]}
                    </div>
                  </span>
                  <span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                    <span className="badge">
                      <Icon name="clock" size={13} /> {t.handsOn(x.recipe.activeMinutes, x.recipe.minutes)}
                    </span>
                    {x.meals.length > 1 && <span className="badge warn">{t.meals(x.meals.length)}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {open && <RecipeSheet recipeId={open.recipe.id} session={open} onClose={() => setOpen(null)} onToast={toast} />}
    </div>
  );
}
