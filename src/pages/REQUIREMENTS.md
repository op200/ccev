# 页面模块 (pages)

## 职责

存放各路由对应的页面组件，组合业务逻辑和 UI 展示。

## 页面清单

### `Home.vue` — 首页 / 市场概览

**路由：** `/`

**功能：**

- 显示当前所选交易所的实时行情列表（`NDataTable`）
- 交易所/交易对选择器（`NSelect`）
- 行情列：交易所、交易对、最新价、24h 涨跌幅、24h 成交量、24h 最高/最低
- 涨跌颜色标签（`NTag`，红跌绿涨）
- 无数据时显示空状态（`NEmpty`）
- 加载时显示加载动画（`NSpin`）

**状态来源：**

- 设置：`useSettingsStore`（启用的交易所列表）
- 交易所信息：`useExchangeStore`（交易对列表）

**待实现：**

- [ ] 实时行情数据拉取
- [ ] 行情排序（按涨跌幅、成交量等）
- [ ] 收藏/置顶交易对
- [ ] 自动刷新（可配置间隔）

---

### `Chart.vue` — K线图表页

**路由：** `/chart`

**功能：**

- 交易所/交易对/周期三级选择器
- 嵌入 `KlineChart` 组件展示 K线
- 无极滚动加载历史数据
- 切换参数后自动重新加载
- 没有交易所时显示提示"请在设置中启用交易所"

**状态来源：**

- 设置：`useSettingsStore`（默认交易所/交易对/周期）
- 交易所：`useExchangeStore`（交易对列表、连接状态）
- K线：`useKlineStore`（数据获取、缓存）

**待实现：**

- [x] 无极滚动加载历史数据（chart 拖动触发 + 手动按钮触发 `loadMore`，调用 REST API 获取更早数据写入 DB）
- [x] 画线工具条（lightweight-charts 不内置画线工具，已启用原生价格线 `priceLineVisible`）
- [ ] 技术指标选择
- [ ] 多交易对对比视图
- [ ] 全屏模式
- [ ] 截图/导出图片

---

### `Integrator.vue` — 数据整合器管理

**路由：** `/integrator`

**功能：**

- 整合器列表（`NDataTable`）：名称、描述、语言标签、渠道数量、启用开关、操作按钮
- 创建/编辑/删除整合器（删除使用 `NPopconfirm` 确认）
- 创建/编辑弹窗（`NModal`，响应式宽度 960px / 95vw）：
  - 名称（必填，最多50字，带字数统计）、描述（选填，`NInput textarea`）
  - 编程语言选择（`NSelect`：JavaScript / TypeScript）
  - 推送渠道多选（`NSelect multiple`）
  - 代码编辑器（`CodeEditor`，基于 Monaco Editor，语法高亮/自动补全/格式化，加载状态 & 错误回退）
- 一键运行整合器并查看执行结果（`NResult` + `NCard` 面板）
- 启用/禁用开关（`NSwitch`，表格内直接切换）
- 渠道未配置时显示警告提示（`NAlert`）
- 空状态引导创建（`NEmpty` + 创建按钮）
- 保存/删除/切换操作后的消息反馈（`useMessage`）
- 加载状态（`NSpin`）

**状态来源：**

- 整合器：`useIntegratorStore`（CRUD、执行）
- 渠道列表：`useSettingsStore.channels`

**待实现：**

- [x] 集成 Monaco Editor 替代 textarea
- [x] 加载状态、错误回退（textarea）
- [x] 运行整合器查看执行结果
- [x] 启用/禁用开关
- [ ] Web Worker / iframe 沙箱执行（当前使用 Function 构造器）
- [ ] 代码错误行号定位
- [ ] 执行历史记录
- [ ] 定时执行（cron 表达式）

---

### `Settings.vue` — 设置页

**路由：** `/settings`

**功能：**

- 标签页（`NTabs`）分组设置项

**通用设置：**

- 语言选择（`NSelect`）：英文 / 简体中文
- 主题选择（`NSelect`）：跟随系统 / 浅色 / 深色
- 默认交易所/交易对/周期

**交易所设置：**

- 复选框列表（`NCheckbox`）：启用/禁用各交易所
- 默认至少选中一个

**通知渠道：**

- 渠道列表表格 + 添加/删除
- 渠道类型选择（钉钉/飞书/邮箱/自定义）
- 各类型配置表单（webhook URL、SMTP 等）

**缓存设置：**

- 最大缓存条数（`NInputNumber`）
- 过期时间（天/小时单位）
- 数据库最大体积
- 当前占用 / 可用空间（`NProgress` 进度条）

**数据获取设置：**

- 分页大小、自动分页间隔
- WebSocket 开关
- 请求超时时间

**导入/导出：**

- 导出按钮：触发文件下载
- 导入按钮：文件选择器上传并恢复

**状态来源：**

- `useSettingsStore`（主数据源）
- `useExchangeStore`（交易所列表用于复选框）

---

### `Docs.vue` — API 文档页

**路由：** `/docs`

**功能：**

- 双标签页布局（`NTabs`）：
  - **「完整 API 参考」**— 无条件展示全部沙箱 API 和数据类型
  - **「按整合器查看」**— 动态分析选定整合器的代码使用情况

**标签页 1 — 完整 API 参考：**

- 统计概览（API 方法数 / 数据类型数）
- **沙箱 API 文档**：`getAllApiDocs()` 返回 8 个 API 的完整文档（4 个 api._ 方法 + 4 个 context._ 属性）
- **数据类型文档**：`getFullTypesReference()` 返回 11 个关键类型定义，按分组展示：
  - 沙箱 API 相关：`IntegratorAPI`
  - 上下文相关：`IntegratorContext`、`IntegratorOutput`
  - K线数据相关：`KlineData`、`KlineTimeframe`、`KlineFetchParams`
  - 推送渠道相关：`ChannelType`、`ChannelConfig`
  - 整合器相关：`Integrator`、`IntegratorExecutionResult`
- 每个类型卡片（`TypeDocCard`）包含：类型标签（interface/type）、名称、源文件路径、描述、属性表（含 NTable）、联合成员（type 类型）、代码示例

**标签页 2 — 按整合器查看：**

- 整合器选择器 + 概览卡片 + 使用统计面板
- 通过 `generateApiDocs()` 解析代码，从代码中提取真实调用示例
- 已使用/可用 API 分类，支持展开隐藏未使用 API

**状态来源：**

- `useIntegratorStore`（整合器列表）

**依赖：**

- `@/utils/api-docs`（动态文档生成器 + 类型参考数据）
- `DocItemCard`（API 文档卡片）
- `TypeDocCard`（类型文档卡片）

**待实现：**

- [ ] 文档搜索（按名称/描述过滤）
- [ ] 导出为 Markdown
- [ ] 在线 API 测试（REPL）

## 规范要求

- 所有页面使用 `<script setup lang="tsx">` 或 `<script setup lang="ts">`
- UI 仅使用 NaiveUI 组件，不编写自定义 CSS 控件
- 页面级状态使用 Pinia Store，局部状态用 `ref`/`reactive`
- 国际化使用 `useI18n().t()`，不硬编码文本
- 加载状态统一用 `NSpin`，空数据用 `NEmpty`，错误用 `NResult`
- 页面遵循移动端响应式布局（NaiveUI 天然支持）
