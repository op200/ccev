# CCEV — CryptoCurrency Enhance View

一个纯前端的加密货币信息统合平台，集成多个交易所数据，支持用户高度自定义信息过滤与推送。

[在线使用](https://op200.github.io/ccev/)

## ✨ 功能

- **📊 多交易所数据聚合** — 基于 [ccxt](https://github.com/ccxt/ccxt) 统一获取各大交易所 USDT 本位合约 K 线数据，WebSocket 优先，支持惰性分页
- **💾 本地持久化缓存** — IndexedDB（Dexie.js）自动缓存，按月分桶存储，过期自动清理，支持版本兼容迁移与一键导入/导出
- **✏️ 自定义整合器** — 内嵌 Monaco Editor，允许用户编写 JS/TS 过滤代码，沙箱执行并支持多渠道推送（钉钉 / 飞书 / 邮箱 / 自定义 Webhook）
- **📈 交互式 K 线图** — 基于 lightweight-charts v5，支持无极滚动、十字光标、明暗主题自适应
- **🌐 国际化** — vue-i18n 驱动，支持简体中文 / English，自动检测浏览器语言
- **🌓 主题切换** — 明 / 暗 / 跟随系统三种模式，联动 NaiveUI
- **📋 API 文档自动生成** — 自动遍历整合器 API 生成可搜索的文档页

## 🛠 技术栈

| 类别       | 技术                           |
| ---------- | ------------------------------ |
| 框架       | Vue 3（Composition API + JSX） |
| 语言       | TypeScript 严格模式            |
| 构建工具   | Vite 8                         |
| UI 库      | NaiveUI                        |
| 状态管理   | Pinia                          |
| 路由       | Vue Router 5                   |
| 数据库     | Dexie.js（IndexedDB）          |
| 图表       | lightweight-charts v5          |
| 代码编辑器 | Monaco Editor                  |
| 交易所 SDK | ccxt                           |
| 国际化     | vue-i18n                       |
| 包管理     | pnpm                           |
| 代码质量   | ESLint + Oxlint + oxfmt        |

## 📁 项目结构

```
ccev/
├── .github/workflows/     # CI/CD（GitHub Pages 部署）
├── public/                # 静态资源
├── src/
│   ├── components/        # 可复用组件
│   │   ├── chart/         #   K 线图组件（lightweight-charts）
│   │   ├── common/        #   通用 UI 组件
│   │   ├── editor/        #   代码编辑器组件（Monaco）
│   │   └── layout/        #   布局组件（AppHeader、AppContent）
│   ├── composables/       # 组合式函数（useTheme 等）
│   ├── db/                # IndexedDB 数据库层（Dexie.js）
│   ├── i18n/              # 国际化配置与语言文件
│   │   └── locales/       #   en.ts / zh-CN.ts
│   ├── pages/             # 页面组件
│   │   ├── Home.vue       #   首页 — 市场行情概览
│   │   ├── Chart.vue      #   K 线图表页
│   │   ├── Integrator.vue #   整合器编辑与执行页
│   │   ├── Docs.vue       #   API 文档页
│   │   └── Settings.vue   #   设置页
│   ├── router/            # 路由配置
│   ├── stores/            # Pinia 状态管理
│   ├── types/             # 全局 TypeScript 类型定义
│   └── utils/             # 工具函数（ccxt 封装、格式化、WebSocket）
├── AGENTS.md              # AI 编码规范
├── index.html
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── vite.config.ts
```

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 25.6.1
- **pnpm** ≥ 11.5.3

### 安装与运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 代码检查与格式化

```bash
# 运行全部检查
pnpm lint

# 单独格式化
pnpm format
```

### 运行测试

```bash
pnpm test:unit
```

## 🔧 配置

项目遵循各模块的 `REQUIREMENTS.md` 需求规范文档：

| 模块       | 文档                              |
| ---------- | --------------------------------- |
| 类型定义   | `src/types/REQUIREMENTS.md`       |
| 数据库     | `src/db/REQUIREMENTS.md`          |
| 国际化     | `src/i18n/REQUIREMENTS.md`        |
| 状态管理   | `src/stores/REQUIREMENTS.md`      |
| 路由       | `src/router/REQUIREMENTS.md`      |
| 工具函数   | `src/utils/REQUIREMENTS.md`       |
| 组合式函数 | `src/composables/REQUIREMENTS.md` |
| 组件       | `src/components/REQUIREMENTS.md`  |
| 页面       | `src/pages/REQUIREMENTS.md`       |

## 📦 CI/CD

通过 GitHub Actions 自动部署到 GitHub Pages：

- 推送到 `main` 分支触发构建
- 使用 pnpm 安装依赖并构建
- 将 `dist/` 目录部署为 Pages 静态站点
