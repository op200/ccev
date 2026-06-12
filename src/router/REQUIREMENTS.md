# 路由模块 (router)

## 职责

定义应用路由结构和页面组织，基于 Vue Router 5。

## 当前路由表

| 路径          | 名称         | 页面组件         | 说明           |
| ------------- | ------------ | ---------------- | -------------- |
| `/`           | `home`       | `Home.vue`       | 首页市场概览   |
| `/chart`      | `chart`      | `Chart.vue`      | K线图表页      |
| `/integrator` | `integrator` | `Integrator.vue` | 数据整合器管理 |
| `/docs`       | `docs`       | `Docs.vue`       | API 文档生成   |
| `/settings`   | `settings`   | `Settings.vue`   | 应用设置       |

## 技术选型

- **vue-router** v5+（`createWebHistory` 模式）
- 所有页面组件懒加载（`() => import(...)`）
- History 模式用于生产（干净 URL）

## 需求规范

### 路由设计原则

- 路径使用小写短横线命名（kebab-case）
- 每个页面独立路由，保持扁平（不嵌套）
- 页面组件使用动态 import 实现代码分割

### 导航

- 顶部导航栏（`AppHeader.vue`）使用 `<router-link>` 或 `useRouter().push`
- 当前页面高亮使用 `router-link-active` 类
- 页面切换无需权限检查（纯前端应用）

### 404 处理

- 未匹配路由重定向到 `/`
- 后续可添加专门的 NotFound 页面

### 路由守卫（待扩展）

- 当前无需路由守卫
- 未来可能需要：离开整合器编辑页面的未保存确认
