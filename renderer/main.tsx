import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';

if (window.timebot?.platform === 'darwin') document.body.classList.add('mac');

const root = document.getElementById('root');
if (root) createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
