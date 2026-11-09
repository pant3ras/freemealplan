import { LANGS } from '../i18n';
import { useStore } from '../state/store';

/** EN | RO toggle. */
export function LangSwitch() {
  const { state, dispatch } = useStore();
  return (
    <div className="lang-switch" role="radiogroup" aria-label="Language / Limbă">
      {LANGS.map((l) => (
        <button key={l} role="radio" aria-checked={state.lang === l} className={state.lang === l ? 'on' : ''} onClick={() => dispatch({ type: 'setLang', lang: l })}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
