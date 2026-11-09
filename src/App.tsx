import { useEffect, useState } from 'react';
import { texts } from './i18n';
import { useLang, useStore } from './state/store';
import { CookTab } from './ui/CookTab';
import { Icon, useToast } from './ui/kit';
import { MeTab } from './ui/MeTab';
import { Onboarding } from './ui/Onboarding';
import { PlanTab } from './ui/PlanTab';
import { RecipesTab } from './ui/RecipesTab';
import { ShopTab } from './ui/ShopTab';

const TABS = [
  { key: 'plan', icon: 'plan' },
  { key: 'cook', icon: 'cook' },
  { key: 'shop', icon: 'cart' },
  { key: 'recipes', icon: 'book' },
  { key: 'me', icon: 'me' },
] as const;

const T = texts({
  en: {
    label: { plan: 'Plan', cook: 'Cook', shop: 'Shop', recipes: 'Recipes', me: 'Me' },
    title: { plan: 'Your week', cook: 'Cooking plan', shop: 'Shopping list', recipes: 'Recipes', me: 'Profile & targets' },
  },
  ro: {
    label: { plan: 'Plan', cook: 'Gătit', shop: 'Cumpărături', recipes: 'Rețete', me: 'Eu' },
    title: { plan: 'Săptămâna ta', cook: 'Plan de gătit', shop: 'Listă de cumpărături', recipes: 'Rețete', me: 'Profil și ținte' },
  },
});

type TabKey = (typeof TABS)[number]['key'];

function readHash(): TabKey {
  const h = location.hash.slice(1);
  return (TABS.find((x) => x.key === h)?.key ?? 'plan') as TabKey;
}

export function App() {
  const { state } = useStore();
  const { s } = useLang();
  const t = s(T);
  const [tab, setTab] = useState<TabKey>(readHash);
  const [toastMsg, toast] = useToast();

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (k: TabKey) => {
    history.replaceState(null, '', `#${k}`);
    setTab(k);
    window.scrollTo({ top: 0 });
  };

  if (!state.profile || !state.plan) return <Onboarding />;

  return (
    <>
      <div className="app">
        <header className="topbar">
          <img className="logo" src="/icon.svg" alt="" />
          <span className="title">{t.title[tab]}</span>
        </header>
        {tab === 'plan' && <PlanTab toast={toast} />}
        {tab === 'cook' && <CookTab toast={toast} />}
        {tab === 'shop' && <ShopTab toast={toast} />}
        {tab === 'recipes' && <RecipesTab toast={toast} />}
        {tab === 'me' && <MeTab toast={toast} />}
      </div>
      <div className="tabs">
        <nav>
          {TABS.map((x) => (
            <button key={x.key} className={tab === x.key ? 'on' : ''} onClick={() => go(x.key)} aria-current={tab === x.key ? 'page' : undefined}>
              <Icon name={x.icon} size={22} />
              {t.label[x.key]}
            </button>
          ))}
        </nav>
      </div>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
