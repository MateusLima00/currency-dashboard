/**
 * controller.js — Orquestrador da aplicação
 *
 * Responsabilidades:
 *  - Inicializar e conectar todos os módulos
 *  - Gerenciar o ciclo de atualização (setInterval + cleanup)
 *  - Coordenar o fluxo: buscar → transformar → despachar estado → UI reage
 *
 * Não contém lógica de negócio (isso é api.js) nem de UI (isso é ui.js).
 * É o "fio condutor" entre eles.
 */

import { fetchDailySeries, aggregateMonthly } from './api.js';
import { seriesCache } from './cache.js';
import { dispatch, getState, subscribe } from './state.js';
import { initUI, showInInfoBox, renderCompareDetail } from './ui.js';
import { setLoading } from './ui.js';

let updateTimer = null;

/**
 * Busca dados (com cache) e atualiza o estado global.
 * @param {{ bustCache?: boolean }} opts
 */
async function refresh({ bustCache = false } = {}) {
  const { config } = getState();

  if (bustCache) seriesCache.bust(config.serieId);

  dispatch({ status: 'loading' });

  try {
    // Tenta cache primeiro; se inválido ou expirado, busca da API
    let daily = seriesCache.load(config.serieId);

    if (!daily) {
      daily = await fetchDailySeries(config.serieId);
      seriesCache.save(config.serieId, daily);
    }

    const monthlyData = aggregateMonthly(daily);

    dispatch({ status: 'ready', monthlyData, errorMessage: null });

  } catch (err) {
    console.error('[controller] Falha ao atualizar:', err);
    dispatch({
      status:       'error',
      errorMessage: err.message ?? 'Erro desconhecido',
    });
  }
}

/**
 * Configura o timer de atualização automática.
 * Retorna a função de cleanup (para trocar intervalo sem leak).
 */
function scheduleAutoRefresh(intervalMs) {
  clearInterval(updateTimer);
  updateTimer = setInterval(() => refresh(), intervalMs);
  return () => clearInterval(updateTimer);
}

/**
 * Ponto de entrada da aplicação.
 * Chamado pelo script inline no HTML com as configs da moeda.
 *
 * @param {{ serieId: string, moeda: string, simbolo: string, grafValorEl: string, grafPctEl: string }} config
 */
export function initFX(config) {
  // 1. Registrar config no estado global (disponível para todos os módulos)
  dispatch({ config });

  // 2. Inicializar UI com os callbacks de ação
  initUI({
    onRefresh: () => refresh({ bustCache: true }),
    onCompare: (v1, v2) => {
      const { monthlyData } = getState();
      const a = monthlyData.find((m) => m.label === v1);
      const b = monthlyData.find((m) => m.label === v2);
      if (a && b) showInInfoBox(renderCompareDetail(a, b));
    },
  });

  // 3. Intervalo de atualização automática — reagir a mudanças no select
  const intervaloEl = document.getElementById('intervalo');
  let cancelSchedule = scheduleAutoRefresh(
    parseInt(intervaloEl?.value ?? '21600000', 10)
  );

  intervaloEl?.addEventListener('change', () => {
    cancelSchedule();
    cancelSchedule = scheduleAutoRefresh(parseInt(intervaloEl.value, 10));
  });

  // 4. Reagir a mudanças de prefs para re-renderizar gráficos sem novo fetch
  //    Usa um flag para evitar re-render no estado 'loading' (evita flash)
  subscribe(async (state) => {
    if (state.status !== 'ready') return;
    // O ui.js já escuta o store também — este listener é só para
    // re-renderizar quando prefs mudam sem mudar monthlyData
  });

  // 5. Loading inicial controlado via JS (não CSS) para estado correto
  const ov = document.getElementById('loadingOverlay');
  if (ov) {
    Object.assign(ov.style, { display: 'flex', opacity: '1', transition: 'opacity 0.4s ease' });
  }

  // 6. Primeira carga
  refresh();
}
