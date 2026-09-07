import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BusinessProvider } from './context/BusinessContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BusinessProvider>
      <App />
    </BusinessProvider>
  </StrictMode>,
);

