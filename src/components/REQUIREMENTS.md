# 组件模块 (components)

## 职责

存放所有可复用 Vue 组件，按功能分目录组织。

## 目录结构

| 目录      | 用途           | 组件                              |
| --------- | -------------- | --------------------------------- |
| `chart/`  | K线图表相关    | `KlineChart.vue`                  |
| `common/` | 通用 UI 组件   | 待添加                            |
| `editor/` | 代码编辑器相关 | 待添加                            |
| `layout/` | 页面布局组件   | `AppHeader.vue`, `AppContent.vue` |

## 各子模块需求

### `chart/` — K线图表组件

#### `KlineChart.vue`

基于 **lightweight-charts** v5+ 的 K线图组件。

**Props：**
| Prop | 类型 | 说明 |
|------|------|------|
| `data` | `KlineData[]` | K线数据数组 |
| `loading` | `boolean?` | 是否加载中 |

**Emits：**
| Event | 参数 | 说明 |
|-------|------|------|
| `loadMore` | — | 用户滚动到图表边界时触发，请求加载更多历史数据 |

**功能需求：**

- [x] 基础 OHLCV 蜡烛图 + 成交量柱状图
- [x] 十字光标（Crosshair）显示价格和成交量
- [x] 自动适配明暗主题（读取 `data-theme` 属性）
- [x] 无极滚动（`loadMore` 事件 + REST API 惰性加载更早历史数据写入 DB，增量加载时保存并恢复可见范围避免缩放；支持 chart 拖动触发 + 手动按钮双重触发）
- [ ] 画线工具（lightweight-charts 不内置画线工具，需通过 `ISeriesPrimitive` 插件接口自行实现趋势线、水平线、矩形等）
- [ ] 图表标记（Marker）支持
- [ ] 技术指标叠加（MA、EMA、布林带等）
- [ ] 时间范围选择器
- [ ] 键盘快捷键（缩放、平移）

**技术要点：**

- `lightweight-charts` 基于 Canvas，性能优异
- 惰性渲染：仅渲染视口内的数据点
- 切换到暗色主题时重新创建 chart 实例（或动态更新 `applyOptions`）
- 响应窗口 resize 自适应尺寸
- **增量加载防缩放**：通过比较新旧数据首条时间戳判断是否为 loadMore 前插，若是则 `setData()` 后恢复可见范围，仅初次加载调用 `fitContent()`
- **内置价格线**：K线序列启用 `priceLineVisible: true` + `lastValueVisible: true`，在最新价位置显示水平虚线及价格标签（库原生功能，非自定义画线）

---

### `layout/` — 布局组件

#### `AppHeader.vue`

顶部导航栏：

- Logo + 应用名称
- 导航链接（首页 / K线图 / 数据整合 / API 文档 / 设置）
- 当前路由高亮
- 响应式设计（移动端折叠菜单）

#### `AppContent.vue`

页面主体容器：

- `<router-view>` 插槽
- 可选的侧边栏（后续版本）

---

### `editor/` — 代码编辑器组件

用于整合器页面提供代码编辑功能。

#### `CodeEditor.vue`

基于 **Monaco Editor**（v0.55+）的代码编辑器封装组件。

**Props：**
| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `string` | — | 代码内容（v-model） |
| `language` | `'javascript' \| 'typescript'` | `'javascript'` | 编程语言 |
| `readonly` | `boolean` | `false` | 是否只读 |
| `height` | `string` | `'420px'` | 编辑器高度 |
| `placeholder` | `string?` | — | 占位提示文字（暂未实现内联） |

**Emits：**
| Event | 参数 | 说明 |
|-------|------|------|
| `update:modelValue` | `value: string` | 代码内容变更 |

**暴露方法：**
| 方法 | 说明 |
|------|------|
| `format()` | 手动触发代码格式化 |
| `getEditor()` | 获取 Monaco 编辑器实例（高级用法） |

**功能特性：**

- [x] JavaScript / TypeScript 语法高亮
- [x] 代码自动补全（整合器 API `api.*` / `context.*` 及 KlineData 等类型提示）
- [x] 代码格式化（`Ctrl+Shift+F`，支持 formatOnPaste）
- [x] 主题跟随系统明暗切换（`vs` / `vs-dark`）
- [x] 括号配对着色、缩进参考线
- [x] 自动布局适应容器尺寸（ResizeObserver）
- [x] 内置整合器沙箱类型定义（IntegratorAPI, IntegratorContext, KlineData 等）
- [x] 模态框延迟初始化（等待容器获得尺寸后再初始化 Monaco）
- [x] 加载状态显示（旋转指示器 + "编辑器中..."）
- [x] 错误回退（Monaco 初始化失败时自动回退为 `<textarea>`）
- [x] Worker 通过 Vite 原生 `?worker` 导入，无需额外插件

**技术要点：**

- Worker 通过 `globalThis.MonacoEnvironment` 注册，兼容 ES 模块严格模式
- Monaco 模块使用动态 `import()` 延迟加载，确保 Worker 环境先于编辑器实例创建
- 使用 `waitForContainerSize()` 轮询容器尺寸，解决模态框过渡动画期间尺寸为 0 的问题
- `ResizeObserver` 替代 `automaticLayout: true`，更精确地控制布局刷新时机
- `isInternalUpdate` 标志防止 v-model 循环更新

---

### `common/` — 通用组件

| 组件                 | 功能             |
| -------------------- | ---------------- |
| `CodeBlock.vue`      | 代码高亮展示块   |
| `DocItemCard.vue`    | API 文档条目卡片 |
| `TypeDocCard.vue`    | 类型文档卡片     |
| `LoadingSpinner.vue` | 统一加载动画     |
| `ErrorBoundary.vue`  | 错误边界展示     |
| `ConfirmDialog.vue`  | 确认弹窗封装     |
| `ThemeToggle.vue`    | 主题切换开关     |
| `LocaleSwitch.vue`   | 语言切换下拉     |

#### `CodeBlock.vue`

基于 **highlight.js** v11+ 的代码高亮块，用于文档中的代码示例展示。

**Props：**
| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `code` | `string` | — | 代码内容 |
| `language` | `'javascript' \| 'typescript'` | `'javascript'` | 代码语言 |
| `showLanguage` | `boolean` | `false` | 是否显示语言标签 |
| `maxHeight` | `string` | `'300px'` | 最大高度（超出滚动） |

**Emits：**
| Event | 参数 | 说明 |
|-------|------|------|
| `copy` | `code: string` | 点击复制按钮 |

**功能特性：**

- [x] JS/TS 语法高亮（通过 highlight.js）
- [x] 一键复制代码
- [x] 明暗主题自适应
- [x] 语言标签显示

## 规范要求

- 组件使用 `<script setup lang="ts">` + Vue JSX 混合语法
- 所有 Props 使用 `defineProps<T>()` 类型推导
- 所有 Emits 使用 `defineEmits<T>()` 类型推导
- UI 控件 **仅使用 NaiveUI**，不自行实现
- 图标使用 NaiveUI 内置图标或 `@vicons` 系列
- 组件样式使用 `<style scoped>` 或 CSS Modules
- 复用逻辑抽取到 composables
