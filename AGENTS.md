# AI 规则

回答时使用中文

每次修改代码时，检查代码位置对应的需求规范文档是否需要更新并实时更新文档

整个项目禁止使用虚假数据，数据不存在则在日志报错

# 项目大纲

本项目名缩写为 `CCEV`，全称 `CryptoCurrency Enhance View`。

项目功能为纯前端统合各个交易所的加密货币信息，让用户可以高度自定义编写信息过滤代码。

# 代码规范

| 类别        | 规范                                                   |
| ----------- | ------------------------------------------------------ |
| 包管理      | 使用 pnpm                                              |
| 语言        | TypeScript 严格模式，禁止在常规代码中使用 JS           |
| 框架        | Vue 3 最新语法，允许 JSX，禁止 Options API             |
| UI 库       | 仅使用 NaiveUI，支持主题切换，默认跟随浏览器主题       |
| CSS         | 所有盒子大小尽量使用比例，而不是用绝对像素大小         |
| 构建工具    | Vite 最新版（最新版不再使用 ESBuild 之类的工具）       |
| 代码风格    | 编写完代码执行静态检查和格式化                         |
| 依赖选择    | 同功能中选开源、功能最先进、维护最频繁、社区最活跃的库 |
| CC 数据获取 | 必须使用 ccxt 获取交易所数据，禁止使用原生 API         |

检查使用 `pnpm type-check` `pnpm lint` `pnpm format`，注意 `pnpm lint` 是执行所有 lint，不要只执行单个 lint

# CI/CD

使用 GitHub Actions 部署页面。

# 模块需求

各模块的详细需求规范见对应目录下的 `REQUIREMENTS.md`：

| 模块       | 路径                              | 职责                                 |
| ---------- | --------------------------------- | ------------------------------------ |
| 类型定义   | `src/types/REQUIREMENTS.md`       | 全局 TypeScript 类型和数据契约       |
| 数据库     | `src/db/REQUIREMENTS.md`          | IndexedDB 持久化、缓存策略、版本迁移 |
| 国际化     | `src/i18n/REQUIREMENTS.md`        | 多语言方案、语言检测、翻译文件       |
| 状态管理   | `src/stores/REQUIREMENTS.md`      | Pinia Store 设计、数据流             |
| 路由       | `src/router/REQUIREMENTS.md`      | 路由结构、页面组织                   |
| 工具函数   | `src/utils/REQUIREMENTS.md`       | 交易所 API 封装、格式化工具          |
| 组合式函数 | `src/composables/REQUIREMENTS.md` | 可复用逻辑（主题等）                 |
| 组件       | `src/components/REQUIREMENTS.md`  | K线图组件、通用组件、编辑器组件      |
| 页面       | `src/pages/REQUIREMENTS.md`       | 各路由页面功能说明                   |

# 功能总览

- **数据获取**：ccxt 获取交易所 USDT 本位合约 K线，优先 WebSocket，支持惰性分页
- **数据保存**：IndexedDB 缓存，自动过期清理，版本兼容迁移，一键导入/导出
- **数据整合**：用户可编写 JS/TS 过滤代码，支持多渠道推送（钉钉/飞书/邮箱/自定义）
- **数据展示**：K线图表交互（画线、无极滚动、惰性渲染）
- **文档生成**：自动遍历整合器 API 生成文档
