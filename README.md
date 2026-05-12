# 📈 FX Monitor

Dashboard interativo para acompanhamento das cotações do **Dólar (USD/BRL)** e **Euro (EUR/BRL)** com dados históricos mensais direto da API do Banco Central do Brasil (BCB).

---

## ✨ Funcionalidades

- 📊 **Gráficos interativos** com variação mensal em valor absoluto e percentual (Plotly.js)
- 🪙 **Dólar e Euro** em páginas separadas com navegação por sidebar
- 🔄 **Atualização automática** configurável (1h, 6h, 12h ou 24h)
- 💾 **Cache inteligente** com TTL de 1 hora — evita requisições desnecessárias
- 🎨 **Personalização visual** com 7 paletas de cores e 4 tipos de gráfico (Área, Linha, Barras, Degrau)
- ⚡ **Proxy CORS com fallback automático** entre múltiplos serviços
- 📅 **Histórico desde janeiro de 2020**
- 🔍 **Comparação entre meses** com detalhe de abertura, fechamento e variação

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 / CSS3 | Estrutura e estilo |
| JavaScript ES Modules | Lógica modular sem bundler |
| [Plotly.js](https://plotly.com/javascript/) | Renderização dos gráficos |
| [API BCB (SGS)](https://www.bcb.gov.br/estatisticas/tabelaespecial) | Fonte de dados oficial |
| Google Fonts (Space Mono + DM Sans) | Tipografia |

---

## 📁 Estrutura do Projeto

```
currency-dashboard/
├── index.html          # Página do Dólar (USD/BRL)
├── euro.html           # Página do Euro (EUR/BRL)
├── style.css           # Estilos globais
└── modules/
    ├── config.js       # Constantes, paletas e configurações centralizadas
    ├── api.js          # Fetch da API do BCB + fallback de proxy CORS
    ├── cache.js        # Cache em localStorage com TTL e versionamento
    ├── state.js        # Store centralizado (padrão Observer)
    ├── controller.js   # Orquestrador: conecta API → Estado → UI
    ├── chart.js        # Renderização dos gráficos com Plotly
    ├── ui.js           # Manipulação do DOM e interações do usuário
    └── errors.js       # Hierarquia de erros tipados
```

---

## 🚀 Como Usar

Por ser um projeto puramente front-end com ES Modules, é necessário servir os arquivos via servidor HTTP (não funciona com `file://`).

**Opção 1 — VS Code (Live Server)**
1. Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clique com o botão direito em `index.html` → **Open with Live Server**

**Opção 2 — Python**
```bash
cd fx_monitor_v6
python -m http.server 8080
# Acesse: http://localhost:8080
```

**Opção 3 — Node.js**
```bash
npx serve fx_monitor_v6
```

---

## 🌐 Fonte de Dados

Os dados são obtidos da API pública do **Banco Central do Brasil (SGS)**:

| Moeda | Série SGS |
|---|---|
| Dólar (USD/BRL) | `21619` |
| Euro (EUR/BRL) | `21620` |

Como a API do BCB não suporta CORS diretamente, a aplicação utiliza proxies em cascata com fallback automático:

1. `corsproxy.io`
2. `api.allorigins.win`
3. `api.codetabs.com`

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular em camadas com separação clara de responsabilidades:

```
                ┌─────────────────────┐
                │     index.html      │
                │    (entry point)    │
                └──────────┬──────────┘
                           │ initFX(config)
                ┌──────────▼──────────┐
                │    controller.js    │  ← orquestrador
                └──┬──────────────┬───┘
                   │              │
        ┌──────────▼──┐      ┌────▼────────┐
        │   api.js    │      │   state.js  │
        │  (fetch +   │      │  (Observer) │
        │  transform) │      └────┬────────┘
        └─────────────┘           │ subscribe
                             ┌────▼────────┐
                             │    ui.js    │
                             │  chart.js  │
                             └─────────────┘
```

**Fluxo principal:**
1. `controller.js` busca dados via `api.js` (com cache em `cache.js`)
2. Os dados processados são despachados para o `state.js`
3. `ui.js` e `chart.js` se inscrevem no store e reagem automaticamente às mudanças

---

## 📜 Licença

Este projeto é de uso livre para fins educacionais e pessoais.

---

> Dados fornecidos pelo [Banco Central do Brasil](https://www.bcb.gov.br) via API pública SGS.
