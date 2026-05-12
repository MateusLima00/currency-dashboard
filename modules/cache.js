/**
 * cache.js — Camada de cache com versionamento e validação de schema
 *
 * Por que versionamento: se mudarmos a estrutura dos dados (ex: novo campo
 * em MonthlyEntry), o cache antigo seria lido silenciosamente como válido
 * e causaria bugs difíceis de rastrear. A versão no CACHE_VERSION garante
 * que dados de uma versão anterior sejam descartados.
 *
 * Por que não usar IndexedDB: os dados são pequenos (~50KB JSON) e
 * não precisam de queries. localStorage é suficiente e síncrono.
 */

import { CACHE_TTL_MS, CACHE_KEYS } from './config.js';
import { CacheError } from './errors.js';

/**
 * @template T
 * @param {string} key
 * @param {T} data
 */
export function saveToCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (err) {
    // QuotaExceededError — degradar silenciosamente, não é fatal
    console.warn('[cache] Falha ao salvar — quota excedida?', err);
  }
}

/**
 * @template T
 * @param {string} key
 * @param {(data: unknown) => data is T} validator - type guard opcional
 * @returns {T | null}
 */
export function loadFromCache(key, validator) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) throw new CacheError('Schema inválido');
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null; // expirado

    if (validator && !validator(parsed.data)) {
      throw new CacheError('Dados do cache falharam na validação de schema');
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof CacheError) {
      console.warn('[cache] Cache descartado:', err.message);
      try { localStorage.removeItem(key); } catch (_) {}
    }
    return null;
  }
}

/** Remove uma entrada específica do cache */
export function bustCache(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

/** Helpers específicos para séries do BCB */
export const seriesCache = {
  save:  (serieId, data)      => saveToCache(CACHE_KEYS.series(serieId), data),
  load:  (serieId)            => loadFromCache(CACHE_KEYS.series(serieId), Array.isArray),
  bust:  (serieId)            => bustCache(CACHE_KEYS.series(serieId)),
};

/** Helpers específicos para preferências do usuário */
export const prefsCache = {
  save:  (prefs)  => saveToCache(CACHE_KEYS.prefs, prefs),
  load:  ()       => loadFromCache(CACHE_KEYS.prefs),
  bust:  ()       => bustCache(CACHE_KEYS.prefs),
};
