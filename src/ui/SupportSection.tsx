import { useState } from 'react';
import { DONATE_URL, mailtoUrl, openLink, openMail, SUPPORT_EMAIL } from '../support';
import { SLOTS, type Slot } from '../data/types';
import { texts } from '../i18n';
import { COMMON } from '../i18n/common';
import { cuisineKey, PHOTO_CREDITS } from '../data/photos';
import { RECIPE_MAP } from '../data/recipes';
import { CUISINES } from '../data/types';
import { useLang } from '../state/store';
import { recipeName } from '../i18n/common';
import { Icon, Seg, Sheet } from './kit';

const T = texts({
  en: {
    title: 'Support & feedback',
    intro: 'WeekPlate is free and works fully offline. If it helps you plan the week, you can buy me a coffee.',
    donate: 'Buy me a coffee',
    recipe: 'Suggest a recipe',
    feedback: 'Send feedback',
    credits: 'Photo credits',
    creditsIntro: 'Food photos come from Wikimedia Commons. Thank you to the photographers who share their work under these licences.',
    photoBy: (author: string, licence: string) => `Photo: ${author} · ${licence}`,
    recipeTitle: 'Suggest a recipe',
    recipeIntro: 'Tell me about a dish you cook. Accepted recipes are added to the app for everyone.',
    feedbackTitle: 'Send feedback',
    feedbackIntro: 'Something broken, confusing or missing? Tell me what you were doing.',
    name: 'Your name (optional)',
    dishName: 'Dish name',
    mealType: 'Meal type',
    ingredients: 'Ingredients, with amounts for one serving',
    steps: 'Method, step by step',
    kind: 'Type',
    kinds: { idea: 'Idea', bug: 'Something is broken', other: 'Other' },
    message: 'Your message',
    contact: 'Contact, if you want an answer (optional)',
    send: 'Open in mail',
    missing: 'Fill in the fields marked as required first.',
    noMail: 'Sending needs an email address set in the app.',
    subjectRecipe: 'WeekPlate recipe suggestion',
    subjectFeedback: 'WeekPlate feedback',
    recipeFields: { dish: 'Dish', meal: 'Meal type', ingredients: 'Ingredients', steps: 'Method', name: 'From' },
    feedbackFields: { kind: 'Type', message: 'Message', contact: 'Contact', name: 'From' },
  },
  ro: {
    title: 'Susține & feedback',
    intro: 'WeekPlate e gratuit și funcționează complet offline. Dacă te ajută să planifici săptămâna, poți să-mi cumperi o cafea.',
    donate: 'Cumpără-mi o cafea',
    recipe: 'Propune o rețetă',
    feedback: 'Trimite feedback',
    credits: 'Credite foto',
    creditsIntro: 'Fotografiile cu mâncare provin de pe Wikimedia Commons. Mulțumim fotografilor care își împart munca sub aceste licențe.',
    photoBy: (author: string, licence: string) => `Foto: ${author} · ${licence}`,
    recipeTitle: 'Propune o rețetă',
    recipeIntro: 'Spune-mi despre un fel de mâncare pe care îl gătești. Rețetele acceptate se adaugă în aplicație pentru toată lumea.',
    feedbackTitle: 'Trimite feedback',
    feedbackIntro: 'Ceva nu merge, e confuz sau lipsește? Spune-mi ce făceai.',
    name: 'Numele tău (opțional)',
    dishName: 'Numele felului de mâncare',
    mealType: 'Tipul mesei',
    ingredients: 'Ingrediente, cu cantități pentru o porție',
    steps: 'Mod de preparare, pas cu pas',
    kind: 'Tip',
    kinds: { idea: 'Idee', bug: 'Ceva nu funcționează', other: 'Altceva' },
    message: 'Mesajul tău',
    contact: 'Contact, dacă vrei un răspuns (opțional)',
    send: 'Deschide în mail',
    missing: 'Completează mai întâi câmpurile obligatorii.',
    noMail: 'Trimiterea are nevoie de o adresă de email setată în aplicație.',
    subjectRecipe: 'Propunere de rețetă WeekPlate',
    subjectFeedback: 'Feedback WeekPlate',
    recipeFields: { dish: 'Fel', meal: 'Tip de masă', ingredients: 'Ingrediente', steps: 'Preparare', name: 'De la' },
    feedbackFields: { kind: 'Tip', message: 'Mesaj', contact: 'Contact', name: 'De la' },
  },
});

type Kind = 'idea' | 'bug' | 'other';

export function SupportSection() {
  const { s } = useLang();
  const t = s(T);
  const [open, setOpen] = useState<'recipe' | 'feedback' | 'credits' | null>(null);

  return (
    <div className="card">
      <h3>{t.title}</h3>
      <p className="muted small">{t.intro}</p>
      <div className="stack" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn primary" onClick={() => void openLink(DONATE_URL)}>
          <Icon name="heart" size={16} /> {t.donate}
        </button>
        <button className="btn" onClick={() => setOpen('recipe')}>
          <Icon name="book" size={16} /> {t.recipe}
        </button>
        <button className="btn" onClick={() => setOpen('feedback')}>
          <Icon name="info" size={16} /> {t.feedback}
        </button>
        <button className="btn ghost sm" onClick={() => setOpen('credits')}>
          {t.credits}
        </button>
      </div>
      {open === 'recipe' && <RecipeForm onClose={() => setOpen(null)} />}
      {open === 'feedback' && <FeedbackForm onClose={() => setOpen(null)} />}
      {open === 'credits' && <PhotoCredits onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Shared: one line of a mail body, skipped when empty. */
const field = (label: string, value: string) => (value.trim() ? `${label}: ${value.trim()}\n` : '');

function RecipeForm({ onClose }: { onClose: () => void }) {
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const [name, setName] = useState('');
  const [dish, setDish] = useState('');
  const [meal, setMeal] = useState<Slot>('dinner');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [error, setError] = useState('');

  const send = () => {
    if (!dish.trim() || !ingredients.trim() || !steps.trim()) return setError(t.missing);
    if (!SUPPORT_EMAIL || SUPPORT_EMAIL.startsWith('REPLACE')) return setError(t.noMail);
    const body =
      field(t.recipeFields.name, name) +
      field(t.recipeFields.dish, dish) +
      field(t.recipeFields.meal, c.slot[meal]) +
      `\n${t.recipeFields.ingredients}:\n${ingredients.trim()}\n\n${t.recipeFields.steps}:\n${steps.trim()}\n\nLanguage: ${lang}\n`;
    openMail(mailtoUrl(t.subjectRecipe, body));
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={t.recipeTitle}>
      <div className="stack">
        <p className="muted small">{t.recipeIntro}</p>
        <input className="input" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder={t.dishName + ' *'} value={dish} onChange={(e) => setDish(e.target.value)} />
        <div>
          <span className="muted small">{t.mealType}</span>
          <Seg
            value={meal}
            options={SLOTS.map((k) => ({ value: k, label: c.slot[k] }))}
            onChange={setMeal}
          />
        </div>
        <textarea className="input" rows={5} placeholder={t.ingredients + ' *'} value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
        <textarea className="input" rows={6} placeholder={t.steps + ' *'} value={steps} onChange={(e) => setSteps(e.target.value)} />
        {error && <div className="callout small">{error}</div>}
        <button className="btn primary" onClick={send}>
          <Icon name="share" size={16} /> {t.send}
        </button>
      </div>
    </Sheet>
  );
}

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const { s } = useLang();
  const t = s(T);
  const [kind, setKind] = useState<Kind>('idea');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');

  const send = () => {
    if (!message.trim()) return setError(t.missing);
    if (!SUPPORT_EMAIL || SUPPORT_EMAIL.startsWith('REPLACE')) return setError(t.noMail);
    const body =
      field(t.feedbackFields.name, name) +
      `${t.feedbackFields.kind}: ${t.kinds[kind]}\n` +
      field(t.feedbackFields.contact, contact) +
      `\n${t.feedbackFields.message}:\n${message.trim()}\n`;
    openMail(mailtoUrl(t.subjectFeedback, body));
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={t.feedbackTitle}>
      <div className="stack">
        <p className="muted small">{t.feedbackIntro}</p>
        <Seg
          value={kind}
          options={(['idea', 'bug', 'other'] as Kind[]).map((k) => ({ value: k, label: t.kinds[k] }))}
          onChange={setKind}
        />
        <input className="input" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input" rows={6} placeholder={t.message + ' *'} value={message} onChange={(e) => setMessage(e.target.value)} />
        <input className="input" placeholder={t.contact} value={contact} onChange={(e) => setContact(e.target.value)} />
        {error && <div className="callout small">{error}</div>}
        <button className="btn primary" onClick={send}>
          <Icon name="share" size={16} /> {t.send}
        </button>
      </div>
    </Sheet>
  );
}

/** CC BY and BY-SA ask for the author, the licence and a link; this lists one line per photo. */
function PhotoCredits({ onClose }: { onClose: () => void }) {
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const label = (key: string) => {
    const cuisine = CUISINES.find((x) => cuisineKey(x) === key);
    if (cuisine) return c.cuisine[cuisine];
    return RECIPE_MAP[key] ? recipeName(RECIPE_MAP[key], lang) : key;
  };
  const rows = Object.entries(PHOTO_CREDITS).sort(([a], [b]) => label(a).localeCompare(label(b)));
  return (
    <Sheet onClose={onClose} title={t.credits}>
      <div className="stack">
        <p className="muted small" style={{ margin: 0 }}>
          {t.creditsIntro}
        </p>
        <div className="list">
          {rows.map(([key, cr]) => (
            <button key={key} className="item" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%', display: 'block' }} onClick={() => void openLink(cr.page)}>
              <b className="small">{label(key)}</b>
              <div className="muted tiny">{t.photoBy(cr.author, cr.licence)}</div>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
