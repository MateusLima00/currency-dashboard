/**
 * api.js — Camada de acesso a dados
 *
 * Responsabilidades:
 *  1. Buscar dados brutos da API do BCB via proxy CORS com fallback
 *  2. Transformar dados diários em agregações mensais
 *  3. Não saber nada sobre DOM, gráficos ou cache
 *
 * Separar isso do resto permite trocar a fonte de dados (ex: outra API)
 * sem tocar em nenhum outro módulo.
 */

import { BCB_API_BASE, CORS_PROXIES, MONTHS_PT, HISTORY_START } from './config.js';
import { ProxyExhaustedError, InvalidPayloadError } from './errors.js';

// ── Tipos (JSDoc) ─────────────────────────────────────────
/**
 * @typedef {{ data: string, valor: number }} DailyEntry
 * @typedef {{ key: string, label: string, startValue: number, endValue: number, diff: number, pct: number, projected?: boolean }} MonthlyEntry
 */

// ── Utilitários internos ──────────────────────────────────

function parseValor(v) {
  return parseFloat(typeof v === 'string' ? v.replace(',', '.') : v);
}

function formatDateDMY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function lastBusinessDay() {
  const d = new Date();
  // Retrocede se for sábado (6→1) ou domingo (0→2)
  const rollback = [2, 0, 0, 0, 0, 0, 1];
  d.setDate(d.getDate() - rollback[d.getDay()]);
  return d;
}

function monthKeyToLabel(key) {
  const [y, mm] = key.split('-');
  return `${MONTHS_PT[parseInt(mm, 10) - 1]}/${y}`;
}

// ── Proxy CORS com fallback ───────────────────────────────

/**
 * Tenta cada proxy em sequência até um funcionar.
 * O timeout de 10s por proxy evita travar em proxy que não responde.
 *
 * @param {string} targetUrl
 * @returns {Promise<unknown>}
 */
async function fetchWithProxyFallback(targetUrl) {
  const errors = [];

  for (const buildProxyUrl of CORS_PROXIES) {
    const proxiedUrl = buildProxyUrl(targetUrl);

    try {
      const res = await fetch(proxiedUrl, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        errors.push(new Error(`HTTP ${res.status} — ${proxiedUrl}`));
        continue;
      }

      const text = await res.text();

      // allorigins encapsula em { contents: "..." } — desembrulhar se necessário
      let jsonStr = text;
      try {
        const wrapper = JSON.parse(text);
        if (typeof wrapper?.contents === 'string') jsonStr = wrapper.contents;
      } catch (_) { /* não era JSON encapsulado */ }

      const trimmed = jsonStr.trim();
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
        errors.push(new Error(`Proxy retornou não-JSON: ${trimmed.slice(0, 60)}`));
        continue;
      }

      return JSON.parse(trimmed);

    } catch (err) {
      errors.push(err);
      console.warn(`[api] Proxy falhou (${proxiedUrl}):`, err.message);
    }
  }

  throw new ProxyExhaustedError(
    `Todos os ${CORS_PROXIES.length} proxies falharam`,
    { cause: errors.at(-1) }
  );
}

// ── Fetch e transformação ─────────────────────────────────

/**
 * Busca dados diários de uma série do BCB.
 * @param {string} serieId
 * @returns {Promise<DailyEntry[]>}
 */
export async function fetchDailySeries(serieId) {
  const to     = formatDateDMY(lastBusinessDay());
  const target = `${BCB_API_BASE}.${serieId}/dados?formato=json&dataInicial=${HISTORY_START}&dataFinal=${to}`;

  const raw = await fetchWithProxyFallback(target);

  if (!Array.isArray(raw)) {
    throw new InvalidPayloadError('BCB retornou payload inesperado (não é array)');
  }
  if (raw.length === 0) {
    throw new InvalidPayloadError('BCB retornou array vazio — possível feriado ou série inativa');
  }

  return raw.map((r) => ({ data: r.data, valor: parseValor(r.valor) }));
}

/**
 * Agrega dados diários em resumos mensais (abertura/fechamento/variação).
 * @param {DailyEntry[]} daily
 * @returns {MonthlyEntry[]}
 */
export function aggregateMonthly(daily) {
  /** @type {Record<string, { date: Date, valor: number }[]>} */
  const groups = {};

  for (const { data, valor } of daily) {
    const [d, m, y] = data.split('/');
    const key = `${y}-${m.padStart(2, '0')}`;
    (groups[key] ??= []).push({ date: new Date(+y, +m - 1, +d), valor });
  }

  // Filtro: somente a partir de HISTORY_START até o mês atual
  const now          = new Date();
  const currentKey   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [startYear]  = HISTORY_START.split('/').reverse(); // '2020'
  const startKey     = `${startYear}-01`;

  return Object.keys(groups)
    .filter((k) => k >= startKey && k <= currentKey)
    .sort()
    .map((key) => {
      const entries = groups[key].sort((a, b) => a.date - b.date);
      const start   = entries.at(0).valor;
      const end     = entries.at(-1).valor;
      const diff    = end - start;
      const pct     = (diff / start) * 100;

      return { key, label: monthKeyToLabel(key), startValue: start, endValue: end, diff, pct };
    });
}
