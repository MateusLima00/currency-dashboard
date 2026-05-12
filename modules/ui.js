/**
 * ui.js — Camada de apresentação (DOM)
 *
 * Responsabilidades:
 *  - Ouvir mudanças de estado e atualizar o DOM de forma reativa
 *  - Construir e injetar o menu de personalização
 *  - Disparar ações do usuário para o controller
 *  - Não conter lógica de negócio — só "o que mostrar"
 *
 * Convenção: funções `render*` são puras (recebem dados, retornam HTML string
 * ou manipulam DOM localizado). Funções `init*` configuram listeners.
 */

import { PALETTES, CHART_TYPES } from './config.js';
import { subscribe, getState, dispatch } from './state.js';
import { renderCharts, attachChartClicks } from './chart.js';

// ── Helpers de formatação ─────────────────────────────────

const fmt4 = (n) => n.toFixed(4);
const fmt2 = (n) => n.toFixed(2);
const sign = (n) => (n >= 0 ? '+' : '');

// ── Componentes de infoBox ────────────────────────────────

function renderMonthDetail(m) {
  const proj     = m.projected ? '<span class="proj-badge">PROJEÇÃO</span>' : '';
  const cls      = m.diff >= 0 ? 'pos' : 'neg';
  return `
    <div class="info-month">${m.label} ${proj}</div>
    <div class="info-row"><span>Abertura</span>   <b>R$ ${fmt4(m.startValue)}</b></div>
    <div class="info-row"><span>Fechamento</span> <b>R$ ${fmt4(m.endValue)}</b></div>
    <div class="info-row"><span>Variação R$</span><b class="${cls}">${sign(m.diff)}R$ ${fmt4(m.diff)}</b></div>
    <div class="info-row"><span>Variação %</span> <b class="${cls}">${sign(m.diff)}${fmt2(m.pct)}%</b></div>
  `;
}

function renderCompareDetail(a, b) {
  const diff = b.endValue - a.endValue;
  const pct  = ((b.endValue / a.endValue - 1) * 100).toFixed(2);
  const cls  = diff >= 0 ? 'pos' : 'neg';
  return `
    <div class="info-month">Análise comparativa</div>
    <div class="info-row"><span>${a.label}</span><b>R$ ${fmt4(a.endValue)}</b></div>
    <div class="info-row"><span>${b.label}</span><b>R$ ${fmt4(b.endValue)}</b></div>
    <div class="info-row"><span>Diferença</span><b class="${cls}">${sign(diff)}R$ ${fmt4(diff)}</b></div>
    <div class="info-row"><span>Variação %</span><b class="${cls}">${sign(parseFloat(pct))}${pct}%</b></div>
  `;
}

function showInInfoBox(html) {
  const hint = document.querySelector('.info-hint');
  const det  = document.getElementById('detalhes');
  if (hint) hint.style.display = 'none';
  det?.classList.remove('hidden');
  if (det) det.innerHTML = html;
}

// ── Stats bar ─────────────────────────────────────────────

function renderStats(monthlyData) {
  const real    = monthlyData.filter((m) => !m.projected);
  if (!real.length) return;

  const current  = real.at(-1);
  const maxM     = real.reduce((a, b) => (a.endValue > b.endValue ? a : b));
  const minM     = real.reduce((a, b) => (a.endValue < b.endValue ? a : b));
  const anoAtual = new Date().getFullYear();
  const primAno  = real.find((m) => m.key.startsWith(`${anoAtual}-`))
                ?? real.find((m) => m.key.startsWith(`${anoAtual - 1}-`));
  const varAno   = primAno
    ? ((current.endValue / primAno.startValue - 1) * 100).toFixed(2)
    : null;

  document.querySelector('#statAtual .stat-value').textContent  = `R$ ${current.endValue.toFixed(2)}`;
  document.querySelector('#statMax .stat-value').innerHTML      = `R$ ${maxM.endValue.toFixed(2)}<small>${maxM.label}</small>`;
  document.querySelector('#statMin .stat-value').innerHTML      = `R$ ${minM.endValue.toFixed(2)}<small>${minM.label}</small>`;

  if (varAno !== null) {
    const isPos = parseFloat(varAno) >= 0;
    const el    = document.querySelector('#statVar .stat-value');
    el.textContent = `${isPos ? '+' : ''}${varAno}%`;
    el.className   = `stat-value ${isPos ? 'pos' : 'neg'}`;
  }
}

// ── Tabela ────────────────────────────────────────────────

function renderTable(monthlyData) {
  const tbody = document.getElementById('tabelaBody');
  if (!tbody) return;

  // Usar DocumentFragment evita múltiplos reflows
  const frag = document.createDocumentFragment();

  [...monthlyData].reverse().forEach((m) => {
    const tr  = document.createElement('tr');
    const cls = m.diff >= 0 ? 'pos' : 'neg';
    if (m.projected) tr.classList.add('projected-row');

    tr.innerHTML = `
      <td><b>${m.label}</b></td>
      <td>R$ ${fmt4(m.startValue)}</td>
      <td>R$ ${fmt4(m.endValue)}</td>
      <td class="${cls}">${sign(m.diff)}R$ ${fmt4(m.diff)}</td>
      <td class="${cls}">${sign(m.diff)}${fmt2(m.pct)}%</td>
      <td>${m.projected
        ? '<span class="proj-badge">Projeção</span>'
        : '<span class="real-badge">Real</span>'
      }</td>
    `;
    tr.addEventListener('click', () => showInInfoBox(renderMonthDetail(m)));
    frag.appendChild(tr);
  });

  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

// ── Selects de comparação ─────────────────────────────────

function populateCompareSelects(monthlyData) {
  const s1 = document.getElementById('mes1');
  const s2 = document.getElementById('mes2');
  if (!s1 || !s2) return;

  const frag1 = document.createDocumentFragment();
  const frag2 = document.createDocumentFragment();

  monthlyData.forEach((m) => {
    const label = m.label + (m.projected ? ' ★' : '');
    const opt1  = Object.assign(document.createElement('option'), { value: m.label, text: label });
    const opt2  = Object.assign(document.createElement('option'), { value: m.label, text: label });
    frag1.appendChild(opt1);
    frag2.appendChild(opt2);
  });

  s1.innerHTML = '';
  s2.innerHTML = '';
  s1.appendChild(frag1);
  s2.appendChild(frag2);

  if (s2.options.length > 1) s2.selectedIndex = s2.options.length - 1;
}

// ── Loading / Error UI ────────────────────────────────────

export function setLoading(on) {
  const ov = document.getElementById('loadingOverlay');
  if (!ov) return;
  if (on) {
    ov.style.cssText = 'display:flex;opacity:1;pointer-events:all;';
  } else {
    ov.style.opacity = '0';
    ov.style.pointerEvents = 'none';
    setTimeout(() => { ov.style.display = 'none'; }, 400);
  }
}

export function showErrorBanner(msg) {
  const b    = document.getElementById('errorBanner');
  const span = b?.querySelector('span');
  if (span) span.textContent = `⚠️ ${msg}`;
  b?.classList.remove('hidden');
}

export function hideErrorBanner() {
  document.getElementById('errorBanner')?.classList.add('hidden');
}

export function setUpdateTime(text) {
  const el = document.getElementById('ultimaAtualizacao');
  if (el) el.textContent = text;
}

// ── Menu de personalização ────────────────────────────────

function buildMenuHTML(prefs) {
  const paletteButtons = Object.entries(PALETTES).map(([key, val]) => `
    <button class="palette-btn ${prefs.palette === key ? 'active' : ''}"
            data-palette="${key}" title="${key}">
      <span class="palette-dot" style="background:${val.main}"></span>
      <span class="palette-dot" style="background:${val.secondary}"></span>
      <span class="palette-name">${key[0].toUpperCase() + key.slice(1)}</span>
    </button>
  `).join('');

  const typeButtons = (field, currentVal) => CHART_TYPES.map((t) => `
    <button class="type-btn ${currentVal === t.key ? 'active' : ''}"
            data-type="${t.key}" data-field="${field}">
      <span>${t.icon}</span>
      <span>${t.label}</span>
    </button>
  `).join('');

  const toggle = (id, label, key, checked) => `
    <label class="menu-toggle">
      <span>${label}</span>
      <input type="checkbox" id="${id}" data-pref="${key}" ${checked ? 'checked' : ''}>
      <span class="toggle-slider"></span>
    </label>
  `;

  return `
    <div class="chart-menu-panel">
      <div class="menu-header">
        <span class="menu-title">🎨 Personalizar Gráficos</span>
        <button class="menu-close" id="btnMenuClose">✕</button>
      </div>

      <div class="menu-section">
        <div class="menu-section-label">Paleta de Cores</div>
        <div class="palette-grid">${paletteButtons}</div>
      </div>

      <div class="menu-section">
        <div class="menu-section-label">Gráfico — Valor (R$)</div>
        <div class="type-grid">${typeButtons('tipoValor', prefs.tipoValor)}</div>
      </div>

      <div class="menu-section">
        <div class="menu-section-label">Gráfico — Variação (%)</div>
        <div class="type-grid">${typeButtons('tipoPct', prefs.tipoPct)}</div>
      </div>

      <div class="menu-section">
        <div class="menu-section-label">Opções</div>
        ${toggle('tgGrid',   'Mostrar grade',     'showGrid',   prefs.showGrid)}
        ${toggle('tgLegend', 'Mostrar legenda',   'showLegend', prefs.showLegend)}
        ${toggle('tgSmooth', 'Linha suavizada',   'smoothLine', prefs.smoothLine)}

        <div class="menu-slider-row">
          <span>Tamanho dos pontos</span>
          <input type="range" min="2" max="12" step="1"
                 value="${prefs.markerSize}" data-pref="markerSize">
          <span class="slider-val">${prefs.markerSize}</span>
        </div>
        <div class="menu-slider-row">
          <span>Espessura da linha</span>
          <input type="range" min="1" max="6" step="0.5"
                 value="${prefs.lineWidth}" data-pref="lineWidth">
          <span class="slider-val">${prefs.lineWidth}</span>
        </div>
      </div>

      <div class="menu-footer">
        <button id="btnResetPrefs" class="btn-reset-prefs">↺ Restaurar padrão</button>
      </div>
    </div>
  `;
}

function mountMenu(prefs) {
  let overlay = document.getElementById('chartMenuOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'chartMenuOverlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = buildMenuHTML(prefs);
  bindMenuEvents(overlay);
  return overlay;
}

function bindMenuEvents(overlay) {
  // Fechar
  overlay.querySelector('#btnMenuClose')?.addEventListener('click', closeMenu);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });

  // Paletas
  overlay.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      dispatch({ prefs: { ...getState().prefs, palette: btn.dataset.palette } });
      overlay.querySelectorAll('.palette-btn').forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
    });
  });

  // Tipos de gráfico
  overlay.querySelectorAll('.type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      dispatch({ prefs: { ...getState().prefs, [field]: btn.dataset.type } });
      overlay.querySelectorAll(`.type-btn[data-field="${field}"]`).forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
    });
  });

  // Checkboxes
  overlay.querySelectorAll('input[type=checkbox][data-pref]').forEach((cb) => {
    cb.addEventListener('change', () => {
      dispatch({ prefs: { ...getState().prefs, [cb.dataset.pref]: cb.checked } });
    });
  });

  // Sliders
  overlay.querySelectorAll('input[type=range][data-pref]').forEach((slider) => {
    const valSpan = slider.nextElementSibling;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      if (valSpan) valSpan.textContent = v;
      dispatch({ prefs: { ...getState().prefs, [slider.dataset.pref]: v } });
    });
  });

  // Reset
  overlay.querySelector('#btnResetPrefs')?.addEventListener('click', () => {
    import('./config.js').then(({ DEFAULT_PREFS }) => {
      dispatch({ prefs: { ...DEFAULT_PREFS } });
      closeMenu();
      mountMenu(DEFAULT_PREFS);
    });
  });
}

function openMenu() {
  const overlay = document.getElementById('chartMenuOverlay');
  overlay?.classList.add('open');
}

function closeMenu() {
  document.getElementById('chartMenuOverlay')?.classList.remove('open');
}

// ── CSV Export ────────────────────────────────────────────

function exportCSV(monthlyData, simbolo) {
  const rows = [['Mês', 'Abertura', 'Fechamento', 'Variação R$', 'Variação %', 'Tipo']];
  monthlyData.forEach((m) => rows.push([
    m.label, fmt4(m.startValue), fmt4(m.endValue),
    fmt4(m.diff), fmt2(m.pct), m.projected ? 'Projeção' : 'Real',
  ]));

  const csv  = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `fx_${simbolo}_BRL_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Debounce util ─────────────────────────────────────────

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Init principal ────────────────────────────────────────

/**
 * Inicializa toda a camada de UI.
 * @param {{ onRefresh: () => void, onCompare: (v1: string, v2: string) => void }} actions
 */
export function initUI({ onRefresh, onCompare }) {
  // Montar menu com as prefs atuais
  const { prefs } = getState();
  mountMenu(prefs);

  // Botão personalizar (sidebar + gear nos gráficos)
  document.querySelectorAll('[data-action="open-menu"]')
    .forEach((btn) => btn.addEventListener('click', openMenu));

  // Fechar erro
  document.getElementById('errorBanner')
    ?.querySelector('button')
    ?.addEventListener('click', hideErrorBanner);

  // Comparar meses — debounce evita chamadas rápidas duplas
  document.getElementById('analisar')
    ?.addEventListener('click', debounce(() => {
      const v1 = document.getElementById('mes1')?.value;
      const v2 = document.getElementById('mes2')?.value;
      if (v1 && v2) onCompare(v1, v2);
    }, 200));

  // Export CSV
  document.getElementById('btnExportCSV')?.addEventListener('click', () => {
    const { monthlyData, config } = getState();
    exportCSV(monthlyData, config.simbolo);
  });

  // Atualizar agora
  document.getElementById('btnAtualizarAgora')
    ?.addEventListener('click', onRefresh);

  // Reagir a mudanças de estado (reativo)
  subscribe(async (state) => {
    if (state.status === 'loading') {
      setLoading(true);
      setUpdateTime('Atualizando...');
      return;
    }

    if (state.status === 'error') {
      setLoading(false);
      setUpdateTime('Erro na atualização');
      showErrorBanner(state.errorMessage ?? 'Erro desconhecido');
      return;
    }

    if (state.status === 'ready') {
      try {
        await renderCharts(state.monthlyData, state.prefs, state.config);
        attachChartClicks(
          [state.config.grafValorEl, state.config.grafPctEl],
          (idx) => showInInfoBox(renderMonthDetail(state.monthlyData[idx]))
        );
        renderStats(state.monthlyData);
        populateCompareSelects(state.monthlyData);
        renderTable(state.monthlyData);
        hideErrorBanner();
        setUpdateTime('Atualizado: ' + new Date().toLocaleString('pt-BR'));
      } finally {
        setLoading(false);
      }
    }
  });
}

// Expor ação de comparar para uso externo
export { showInInfoBox, renderCompareDetail };
