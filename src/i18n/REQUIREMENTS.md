# 国际化模块 (i18n)

## 职责

提供多语言支持，确保所有用户可见文本可翻译。

## 当前实现

### 技术选型

- **vue-i18n** v11+（Composition API 模式，`legacy: false`）

### 支持语言

| 语言代码 | 名称                 | 文件               |
| -------- | -------------------- | ------------------ |
| `en`     | English（默认/回退） | `locales/en.ts`    |
| `zh-CN`  | 简体中文             | `locales/zh-CN.ts` |

### 语言检测

1. 读取 `localStorage` 中的 `ccev-locale`（用户手动选择）
2. 若无，检测 `navigator.language`：
   - `zh*` → `zh-CN`
   - 其他 → `en`
3. 回退语言：`en`

### 核心 API

| 导出                | 说明                                     |
| ------------------- | ---------------------------------------- |
| `i18n`              | `createI18n()` 实例，在 `main.ts` 中注册 |
| `SUPPORTED_LOCALES` | 支持的语言代码数组                       |
| `SupportedLocale`   | 语言代码联合类型                         |
| `LOCALE_LABELS`     | 语言显示名称映射                         |
| `setLocale(locale)` | 切换语言并持久化到 localStorage          |

## 需求规范

### 翻译文件结构

- 按页面/功能模块组织 key 层级：
  ```
  app.title, app.description
  nav.home, nav.chart, nav.integrator, nav.settings, nav.docs
  home.*, chart.*, integrator.*, settings.*, docs.*
  channel.* (渠道类型名称)
  ```
- key 使用点分隔嵌套，vue-i18n 自动扁平

### 新增语言流程

1. 在 `src/i18n/locales/` 下新建立语言文件（如 `ja.ts`）
2. 以 `en.ts` 为模板翻译所有 key
3. 在 `index.ts` 中注册：添加到 `SUPPORTED_LOCALES`、`LOCALE_LABELS`、`messages`
4. 更新 `detectBrowserLocale` 映射

### 使用规范

- 页面/组件中使用 `useI18n().t('xxx.yyy')` 获取翻译文本
- 禁止硬编码中文/英文字符串
- 插值使用 `t('key', { var: value })`
- 复数等高级特性按需使用 vue-i18n 能力

### 开发约束

- 添加新 UI 文本时必须同步添加到 `en.ts` 和 `zh-CN.ts`
- key 命名语义化，避免 `text1`、`label2` 等无意义命名
- 相同含义的文本复用同一 key，不重复定义
