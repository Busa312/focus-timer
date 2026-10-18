import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { captureInstallPrompt } from './lib/install';
import { setupServiceWorker } from './pwa';

captureInstallPrompt();
setupServiceWorker();

const root = createRoot(document.getElementById('root')!);

if (import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')) {
  void import('./dev/Gallery').then(({ Gallery }) => root.render(<Gallery />));
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
