import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createStore } from '@actioncrew/actionstack';
import { counter } from './store';

export const store = createStore();
export const counterModule = counter.init(store);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
