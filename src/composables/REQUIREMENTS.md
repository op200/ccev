# 组合式函数模块 (composables)

## 职责

封装可复用的 Vue 3 组合式逻辑，供多个组件共享。

## 当前实现

### `useTheme.ts` — 主题管理

**功能：**

- 管理应用明暗主题
- 联动 NaiveUI 主题系统
- 支持三种模式：`auto`（跟随系统）、`light`、`dark`
- 监听系统主题变化（`useOsTheme`）

**导出：**
| 导出 | 类型 | 说明 |
|------|------|------|
| `currentTheme` | `Ref<'light' \| 'dark'>` | 当前实际主题 |
| `naiveTheme` | `Ref<GlobalTheme \| null>` | NaiveUI 主题对象 |
| `applyTheme(theme)` | 函数 | 应用主题（更新 ref + DOM 属性） |
| `initTheme()` | 异步函数 | 从设置中读取主题偏好并应用 |

**DOM 交互：**

- `applyTheme` 在 `<html>` 上设置 `data-theme` 属性（`light` / `dark`）
- 此属性被 chart 和其他组件读取以同步颜色

**主题初始化流程：**

```
应用启动 → initTheme() → 读取 DB 设置 → applyTheme(theme)
                                          ↓
                              更新 currentTheme / naiveTheme
                              更新 <html data-theme>
                              组件响应式更新颜色
```

## 需求规范

### 设计原则

- 每个 composable 一个文件，职责单一
- 使用 `export function useXxx()` 命名
- 返回值是响应式引用或方法，不返回组件实例
- 在需要时才创建（lazy initialization）

### 待添加的 composables

| 文件名                   | 功能                                   |
| ------------------------ | -------------------------------------- |
| `useTheme.ts`            | ✅ 主题管理                            |
| `useStorage.ts`          | IndexedDB / localStorage 通用读写 hook |
| `useDebounce.ts`         | 防抖/节流工具                          |
| `useChartInteraction.ts` | K线图交互逻辑（画线、缩放、滚动）      |
| `useWebSocket.ts`        | WebSocket 连接管理通用逻辑             |
| `usePageVisibility.ts`   | 页面可见性监听                         |

### 使用规范

- composables 放在 `src/composables/`，命名 `useXxx.ts`
- 在 Vue 组件的 `<script setup>` 中调用
- 避免在 composable 中直接操作 DOM（除非必要）
- 不依赖 Pinia Store（保持独立性），需要持久化时接收参数
