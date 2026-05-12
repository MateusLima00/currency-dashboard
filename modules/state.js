/**
 * state.js — Store de estado centralizado (padrão Observer simplificado)
 *
 * Por que isso existe: sem um store central, o estado fica espalhado em
 * variáveis globais e cada módulo atualiza o DOM diretamente. Isso cria
 * acoplamento implícito — uma função em chart.js acaba dependendo de uma
 * variável definida em ui.js sem contrato explícito.
 *
 * Com esse store:
 *  - O estado tem uma única fonte de verdade
 *  - Módulos se inscrevem em mudanças com `subscribe(listener)`
 *  - `dispatch(patch)` é a única forma de mudar o estado
 *  - Fácil de debugar: logar todas as chamadas a dispatch
 */

import { DEFAULT_PREFS } from './config.js';
import { prefsCache } from './cache.js';

/** @typedef {'idle' | 'loading' | 'error' | 'ready'} AppStatus */

/**
 * @typedef {Object} AppState
 * @property {AppStatus} status
 * @property {import('./api.js').MonthlyEntry[]} monthlyData
 * @property {string | null} errorMessage
 * @property {string | null} lastUpdated
 * @property {typeof DEFAULT_PREFS} prefs
 * @property {{ serieId: string, moeda: string, simbolo: string, grafValorEl: string, grafPctEl: string }} config
 */

/** @type {AppState} */
const initialState = {
  status:       'idle',
  monthlyData:  [],
  errorMessage: null,
  lastUpdated:  null,
  prefs:        { ...DEFAULT_PREFS, ...(prefsCache.load() ?? {}) },
  config:       {},
};

let state = { ...initialState };

/** @type {Set<(state: AppState) => void>} */
const listeners = new Set();

/** Retorna snapshot imutável do estado atual */
export function getState() {
  return Object.freeze({ ...state, prefs: { ...state.prefs } });
}

/**
 * Atualiza o estado e notifica os listeners.
 * @param {Partial<AppState>} patch
 */
export function dispatch(patch) {
  state = { ...state, ...patch };

  // Persistir prefs automaticamente quando mudarem
  if (patch.prefs) {
    prefsCache.save({ ...state.prefs, ...patch.prefs });
  }

  for (const listener of listeners) {
    listener(getState());
  }
}

/**
 * Inscreve um listener nas mudanças de estado.
 * Retorna função de cancelamento (unsubscribe).
 * @param {(state: AppState) => void} listener
 * @returns {() => void}
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
