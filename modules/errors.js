/**
 * errors.js — Hierarquia de erros tipados do FX Monitor
 *
 * Por que isso existe: jogar `new Error("deu ruim")` torna impossível
 * distinguir um erro de rede de um erro de parsing em quem chama.
 * Com classes específicas, o catch pode reagir de forma diferente
 * a cada tipo de falha — ex: não mostrar banner em ProxyExhaustedError
 * se já tiver dados em cache.
 */

export class FXError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = this.constructor.name;
    // Preserva a causa raiz para debugging (spec ES2022)
    if (cause) this.cause = cause;
  }
}

/** Todos os proxies CORS falharam ao tentar alcançar a API do BCB */
export class ProxyExhaustedError extends FXError {}

/** A API respondeu, mas o payload não é o esperado */
export class InvalidPayloadError extends FXError {}

/** Cache existe mas está corrompido ou expirado */
export class CacheError extends FXError {}
