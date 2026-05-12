/**
 * config.js — Única fonte de verdade para constantes e configurações
 *
 * Centralizar aqui evita magic strings espalhadas pelo código.
 * Se a API do BCB mudar de domínio, muda-se em um único lugar.
 */

export const BCB_API_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

export const HISTORY_START = '01/01/2020';

/** TTL do cache de dados da API (1h). Separado do TTL de prefs. */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/** Versão do schema do cache. Incrementar quebra caches antigos intencionalmente. */
export const CACHE_VERSION = 2;

export const CACHE_KEYS = {
  prefs:   'fx:prefs:v1',
  series:  (id) => `fx:series:v${CACHE_VERSION}:${id}`,
};

export const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/**
 * Proxies CORS em ordem de confiabilidade.
 * Cada entrada é uma função que recebe a URL alvo e retorna a URL proxiada.
 * Usar funções (não strings) permite lógica de transformação por proxy.
 */
export const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/** Paletas de cores disponíveis no menu de personalização */
export const PALETTES = {
  verde:   { main: '#00d4aa', secondary: '#f7a600', neg: '#f05060', fill: '15' },
  azul:    { main: '#4f9cf9', secondary: '#f7a600', neg: '#f05060', fill: '20' },
  roxo:    { main: '#7c6af7', secondary: '#f77cc2', neg: '#f05060', fill: '18' },
  laranja: { main: '#ff7b39', secondary: '#ffcc00', neg: '#f05060', fill: '20' },
  rosa:    { main: '#f77cc2', secondary: '#7c6af7', neg: '#f05060', fill: '20' },
  ciano:   { main: '#00bcd4', secondary: '#ff9800', neg: '#f05060', fill: '18' },
  ouro:    { main: '#ffd700', secondary: '#00d4aa', neg: '#f05060', fill: '15' },
};

/** Tipos de visualização disponíveis com metadata de UI */
export const CHART_TYPES = [
  { key: 'area',   icon: '📈', label: 'Área'   },
  { key: 'linha',  icon: '〰️', label: 'Linha'  },
  { key: 'barra',  icon: '📊', label: 'Barras' },
  { key: 'degrau', icon: '📉', label: 'Degrau' },
];

/** Intervalos de atualização automática */
export const UPDATE_INTERVALS = [
  { value: 3_600_000,  label: 'A cada 1 hora'   },
  { value: 21_600_000, label: 'A cada 6 horas'  },
  { value: 43_200_000, label: 'A cada 12 horas' },
  { value: 86_400_000, label: 'A cada 24 horas' },
];

/** Preferências padrão do usuário */
export const DEFAULT_PREFS = {
  palette:    'verde',
  tipoValor:  'area',
  tipoPct:    'barra',
  showGrid:   true,
  showLegend: true,
  smoothLine: true,
  markerSize: 5,
  lineWidth:  2.5,
};
