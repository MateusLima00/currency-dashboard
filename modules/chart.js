/**
 * chart.js — Módulo de renderização de gráficos (Plotly)
 *
 * Responsabilidades:
 *  - Construir traces e layouts Plotly a partir do estado
 *  - Não saber nada sobre fetch, cache ou UI estrutural
 *
 * Recebe dados e prefs como parâmetros puros — sem acessar estado global.
 * Isso facilita testar e reutilizar (ex: gráfico de comparação isolado).
 */

import { PALETTES } from './config.js';

// ── Tema base do Plotly ───────────────────────────────────

/**
 * @param {{ showGrid: boolean }} prefs
 */
function buildTheme(prefs) {
  const gridcolor = prefs.showGrid
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0)';

  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font:          { family: 'DM Sans, sans-serif', color: '#b0bec5', size: 12 },
    gridcolor,
    zerolinecolor: 'rgba(255,255,255,0.1)',
  };
}

function buildCommonAxis(theme) {
  return {
    showgrid:      true,
    gridcolor:     theme.gridcolor,
    zeroline:      true,
    zerolinecolor: theme.zerolinecolor,
    tickfont:      { color: theme.font.color },
    linecolor:     'rgba(255,255,255,0.08)',
  };
}

// ── Builders de trace ─────────────────────────────────────

/**
 * @param {{ labels: string[], values: number[], projected: boolean[], palette: object, prefs: object }} opts
 */
function buildTraceValor({ labels, values, projected, palette, prefs }) {
  const colors = projected.map((p) => (p ? 'rgba(255,200,0,0.6)' : palette.main));

  if (prefs.tipoValor === 'barra') {
    return {
      x: labels, y: values,
      name: 'Fechamento (R$)',
      type: 'bar',
      marker: { color: colors, line: { width: 0 } },
      hovertemplate: '<b>%{x}</b><br>R$ %{y:.4f}<extra></extra>',
    };
  }

  const shape = prefs.tipoValor === 'degrau'
    ? 'hv'
    : prefs.smoothLine ? 'spline' : 'linear';

  const isArea = prefs.tipoValor === 'area';

  return {
    x: labels, y: values,
    name: 'Fechamento (R$)',
    type: 'scatter',
    mode: 'lines+markers',
    line:   { color: palette.main, width: prefs.lineWidth, shape },
    marker: {
      size:   projected.map((p) => (p ? 10 : prefs.markerSize)),
      color:  colors,
      symbol: projected.map((p) => (p ? 'diamond' : 'circle')),
    },
    fill:      isArea ? 'tozeroy' : 'none',
    fillcolor: isArea ? `${palette.main}${palette.fill}` : undefined,
    hovertemplate: '<b>%{x}</b><br>R$ %{y:.4f}<extra></extra>',
  };
}

/**
 * @param {{ labels: string[], values: number[], projected: boolean[], palette: object, prefs: object }} opts
 */
function buildTracePct({ labels, values, projected, palette, prefs }) {
  if (prefs.tipoPct === 'barra') {
    return {
      x: labels, y: values,
      name: 'Variação (%)',
      type: 'bar',
      marker: {
        color: values.map((v, i) =>
          projected[i] ? 'rgba(255,200,0,0.5)' : v >= 0 ? palette.main : palette.neg
        ),
        line: { width: 0 },
      },
      hovertemplate: '<b>%{x}</b><br>%{y:.2f}%<extra></extra>',
    };
  }

  const shape  = prefs.tipoPct === 'degrau' ? 'hv' : prefs.smoothLine ? 'spline' : 'linear';
  const isArea = prefs.tipoPct === 'area';

  return {
    x: labels, y: values,
    name: 'Variação (%)',
    type: 'scatter',
    mode: 'lines+markers',
    line:   { color: palette.secondary, width: prefs.lineWidth, shape },
    marker: { size: prefs.markerSize, color: palette.secondary },
    fill:      isArea ? 'tozeroy' : 'none',
    fillcolor: isArea ? `${palette.secondary}20` : undefined,
    hovertemplate: '<b>%{x}</b><br>%{y:.2f}%<extra></extra>',
  };
}

// ── API pública ───────────────────────────────────────────

/**
 * Renderiza (ou atualiza) os dois gráficos principais.
 *
 * @param {import('./api.js').MonthlyEntry[]} monthlyData
 * @param {import('./state.js').AppState['prefs']} prefs
 * @param {{ grafValorEl: string, grafPctEl: string }} config
 * @returns {Promise<void>}
 */
export async function renderCharts(monthlyData, prefs, config) {
  const palette    = PALETTES[prefs.palette] ?? PALETTES.verde;
  const theme      = buildTheme(prefs);
  const commonAxis = buildCommonAxis(theme);

  const labels    = monthlyData.map((m) => m.label);
  const values    = monthlyData.map((m) => m.endValue);
  const pctValues = monthlyData.map((m) => m.pct);
  const projected = monthlyData.map((m) => Boolean(m.projected));

  const traceVal = buildTraceValor({ labels, values, projected, palette, prefs });
  const tracePct = buildTracePct({ labels, values: pctValues, projected, palette, prefs });

  const baseLayout = {
    ...theme,
    legend:    { x: 0, y: 1, font: { color: '#b0bec5' }, visible: prefs.showLegend },
    hovermode: 'x unified',
  };

  const layoutVal = {
    ...baseLayout,
    margin: { t: 10, b: 60, l: 55, r: 10 },
    xaxis: {
      ...commonAxis, tickangle: -45,
      rangeslider: { visible: true, thickness: 0.06, bgcolor: 'rgba(255,255,255,0.03)' },
    },
    yaxis: { ...commonAxis, tickprefix: 'R$ ' },
  };

  const layoutPct = {
    ...baseLayout,
    margin: { t: 10, b: 60, l: 50, r: 10 },
    xaxis:  { ...commonAxis, tickangle: -45 },
    yaxis:  { ...commonAxis, ticksuffix: '%' },
  };

  const plotConfig = { responsive: true, displayModeBar: false };

  // Aguardar ambos antes de retornar — attachClicks depende disso
  await Promise.all([
    Plotly.react(config.grafValorEl, [traceVal], layoutVal, plotConfig),
    Plotly.react(config.grafPctEl,   [tracePct], layoutPct, plotConfig),
  ]);

  // Propagar cores da paleta para o CSS
  document.documentElement.style.setProperty('--accent',  palette.main);
  document.documentElement.style.setProperty('--accent2', palette.secondary);
}

/**
 * Registra listener de clique nos gráficos Plotly.
 * Retorna cleanup para evitar listeners duplicados.
 *
 * @param {string[]} elIds
 * @param {(index: number) => void} onPointClick
 */
export function attachChartClicks(elIds, onPointClick) {
  for (const id of elIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    // Plotly expõe removeAllListeners no elemento após render
    el.removeAllListeners?.('plotly_click');
    el.on('plotly_click', (data) => {
      const idx = data?.points?.[0]?.pointIndex;
      if (idx != null) onPointClick(idx);
    });
  }
}
