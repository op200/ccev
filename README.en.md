# CCEV — CryptoCurrency Enhance View

A pure frontend cryptocurrency information aggregation platform that integrates data from multiple exchanges, enabling users to write highly customizable data filtering and alerting code.

[Use online](https://op200.github.io/ccev/)

## ✨ Features

- **📊 Multi-Exchange Data Aggregation** — Unified access to USDT-margined contract K-line data across major exchanges via [ccxt](https://github.com/ccxt/ccxt). WebSocket-first with lazy pagination support.
- **💾 Local Persistent Cache** — IndexedDB (Dexie.js) auto-caching with month-based bucketing, automatic TTL expiration, version-compatible migration, and one-click import/export.
- **✏️ Custom Integrator** — Embedded Monaco Editor allows users to write JS/TS filtering code, executed in a sandbox with multi-channel push support (DingTalk / Feishu / Email / Custom Webhook).
- **📈 Interactive K-line Chart** — Built on lightweight-charts v5 with infinite scrolling, crosshair cursor, and light/dark theme auto-adaptation.
- **🌐 Internationalization** — Powered by vue-i18n, supporting Simplified Chinese / English with automatic browser language detection.
- **🌓 Theme Switching** — Light / Dark / System modes, integrated with NaiveUI.
- **📋 Auto-generated API Docs** — Automatically traverses the integrator API to generate searchable documentation pages.

## 🛠 Tech Stack

| Category         | Technology                    |
| ---------------- | ----------------------------- |
| Framework        | Vue 3 (Composition API + JSX) |
| Language         | TypeScript (strict mode)      |
| Build Tool       | Vite 8                        |
| UI Library       | NaiveUI                       |
| State Management | Pinia                         |
| Router           | Vue Router 5                  |
| Database         | Dexie.js (IndexedDB)          |
| Charting         | lightweight-charts v5         |
| Code Editor      | Monaco Editor                 |
| Exchange SDK     | ccxt                          |
| i18n             | vue-i18n                      |
| Package Manager  | pnpm                          |
| Code Quality     | ESLint + Oxlint + oxfmt       |

## 📁 Project Structure

```
ccev/
├── .github/workflows/     # CI/CD (GitHub Pages deployment)
├── public/                # Static assets
├── src/
│   ├── components/        # Reusable components
│   │   ├── chart/         #   K-line chart component (lightweight-charts)
│   │   ├── common/        #   Common UI components
│   │   ├── editor/        #   Code editor component (Monaco)
│   │   └── layout/        #   Layout components (AppHeader, AppContent)
│   ├── composables/       # Composable functions (useTheme, etc.)
│   ├── db/                # IndexedDB database layer (Dexie.js)
│   ├── i18n/              # i18n config and locale files
│   │   └── locales/       #   en.ts / zh-CN.ts
│   ├── pages/             # Page components
│   │   ├── Home.vue       #   Home — market overview
│   │   ├── Chart.vue      #   K-line chart page
│   │   ├── Integrator.vue #   Integrator editor & execution page
│   │   ├── Docs.vue       #   API documentation page
│   │   └── Settings.vue   #   Settings page
│   ├── router/            # Route configuration
│   ├── stores/            # Pinia state management
│   ├── types/             # Global TypeScript type definitions
│   └── utils/             # Utilities (ccxt wrapper, formatters, WebSocket)
├── AGENTS.md              # AI coding conventions
├── index.html
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── vite.config.ts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 25.6.1
- **pnpm** ≥ 11.5.3

### Install & Run

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Lint & Format

```bash
# Run all checks
pnpm lint

# Format only
pnpm format
```

### Run Tests

```bash
pnpm test:unit
```

## 🔧 Configuration

The project follows per-module `REQUIREMENTS.md` specifications:

| Module      | Document                          |
| ----------- | --------------------------------- |
| Types       | `src/types/REQUIREMENTS.md`       |
| Database    | `src/db/REQUIREMENTS.md`          |
| i18n        | `src/i18n/REQUIREMENTS.md`        |
| Stores      | `src/stores/REQUIREMENTS.md`      |
| Router      | `src/router/REQUIREMENTS.md`      |
| Utils       | `src/utils/REQUIREMENTS.md`       |
| Composables | `src/composables/REQUIREMENTS.md` |
| Components  | `src/components/REQUIREMENTS.md`  |
| Pages       | `src/pages/REQUIREMENTS.md`       |

## 📦 CI/CD

Automatically deployed to GitHub Pages via GitHub Actions:

- Push to `main` branch triggers the build
- Uses pnpm to install dependencies and build
- Deploys `dist/` directory as a static Pages site
