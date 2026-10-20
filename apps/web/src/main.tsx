import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './estilos.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('elemento #root nao encontrado');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
