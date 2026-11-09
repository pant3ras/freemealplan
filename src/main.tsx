import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { restoreNativeData, setupNativeShell } from './native';
import { StoreProvider } from './state/store';
import './styles.css';

// In the Android app the saved data may need copying back from native storage before
// the store reads it; in the browser this resolves immediately.
void restoreNativeData().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>,
  );
  void setupNativeShell();
});
