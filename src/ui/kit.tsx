import { useEffect, useId, useState, type ReactNode } from 'react';
import type { Ingredient } from '../data/types';
import type { Lang } from '../i18n';

export function money(n: number, digits = 0): string {
  return `${n.toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits })} lei`;
}

export function grams(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${Math.round(g)} g`;
}

/** Count units: [singular, plural] per language. */
const UNIT_NAMES: Record<string, { en: [string, string]; ro: [string, string] }> = {
  egg: { en: ['egg', 'eggs'], ro: ['ou', 'ouă'] },
  slice: { en: ['slice', 'slices'], ro: ['felie', 'felii'] },
  tomato: { en: ['tomato', 'tomatoes'], ro: ['roșie', 'roșii'] },
  cucumber: { en: ['cucumber', 'cucumbers'], ro: ['castravete', 'castraveți'] },
  onion: { en: ['onion', 'onions'], ro: ['ceapă', 'cepe'] },
  clove: { en: ['clove', 'cloves'], ro: ['cățel', 'căței'] },
  carrot: { en: ['carrot', 'carrots'], ro: ['morcov', 'morcovi'] },
  pepper: { en: ['pepper', 'peppers'], ro: ['ardei', 'ardei'] },
  courgette: { en: ['courgette', 'courgettes'], ro: ['dovlecel', 'dovlecei'] },
  apple: { en: ['apple', 'apples'], ro: ['măr', 'mere'] },
  banana: { en: ['banana', 'bananas'], ro: ['banană', 'banane'] },
  lemon: { en: ['lemon', 'lemons'], ro: ['lămâie', 'lămâi'] },
  lime: { en: ['lime', 'limes'], ro: ['lime', 'lime'] },
  avocado: { en: ['avocado', 'avocados'], ro: ['avocado', 'avocado'] },
  wrap: { en: ['wrap', 'wraps'], ro: ['tortilla', 'tortilla'] },
  bun: { en: ['bun', 'buns'], ro: ['chiflă', 'chifle'] },
  pita: { en: ['pita', 'pitas'], ro: ['lipie', 'lipii'] },
  aubergine: { en: ['aubergine', 'aubergines'], ro: ['vânătă', 'vinete'] },
  leek: { en: ['leek', 'leeks'], ro: ['fir de praz', 'fire de praz'] },
  chilli: { en: ['chilli', 'chillies'], ro: ['ardei iute', 'ardei iuți'] },
};

/** "≈ 3 eggs" / "≈ 3 ouă" for ingredients that have a natural count unit. */
export function unitHint(ing: Ingredient, g: number, lang: Lang = 'en'): string {
  if (!ing.unit) return '';
  const n = Math.round((g / ing.unit.grams) * 2) / 2;
  if (n <= 0) return '';
  const names = UNIT_NAMES[ing.unit.name]?.[lang] ?? [ing.unit.name, `${ing.unit.name}s`];
  return `≈ ${n.toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB')} ${n === 1 ? names[0] : names[1]}`;
}

const ICONS: Record<string, ReactNode> = {
  plan: <path d="M4 5h16v15H4zM4 9h16M8 3v4M16 3v4" />,
  cook: <path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2 11h20M9 4c0 2-1 2-1 4M13 4c0 2-1 2-1 4M17 4c0 2-1 2-1 4" />,
  cart: <path d="M3 4h2l2.5 11h11L21 7H6.5M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />,
  book: <path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" />,
  me: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
  swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
  lock: <path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3" />,
  unlock: <path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2" />,
  out: <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 2 2M9 3v5a2 2 0 0 1-2 2M17 21V3c-2 1-3 4-3 8h3" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  ban: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8" />,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" />,
  print: <path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  info: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
};

export function Icon({ name, size = 20 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export function Sheet({ onClose, title, children }: { onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title !== undefined && (
          <div className="sheet-head spread">
            <h2 className="grow">{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, bad }: { value: T[]; options: { value: T; label: string }[]; onChange: (v: T[]) => void; bad?: boolean }) {
  return (
    <div className="row wrap">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            className={`chip ${on ? 'on' : ''} ${bad ? 'bad' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberField({ label, value, onChange, suffix, min, max, step = 1 }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; min?: number; max?: number; step?: number }) {
  const [text, setText] = useState(String(value));
  const id = useId();
  useEffect(() => setText(String(value)), [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row">
        <input
          id={id}
          className="input"
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value.replace(',', '.'));
            if (Number.isFinite(n) && e.target.value.trim() !== '') onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
          }}
          onBlur={() => setText(String(value))}
          step={step}
        />
        {suffix && <span className="muted small">{suffix}</span>}
      </div>
    </div>
  );
}

export function Bar({ value, max, band, tone }: { value: number; max: number; band?: [number, number]; tone?: 'warn' | 'bad' }) {
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / max) * 100))}%`;
  return (
    <div className={`bar ${tone ?? ''}`}>
      <span style={{ width: pct(value) }} />
      {band && <i className="band" style={{ left: pct(band[0]), width: `calc(${pct(band[1])} - ${pct(band[0])})` }} />}
    </div>
  );
}

let toastTimer: number | undefined;
export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  return [
    msg,
    (m: string) => {
      setMsg(m);
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setMsg(null), 2200);
    },
  ];
}
