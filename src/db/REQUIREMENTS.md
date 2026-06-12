# 数据库模块 (db)

## 职责

基于 Dexie.js 封装 IndexedDB 操作，管理所有持久化数据：

- 应用设置（单条记录）
- K线缓存（嵌套字典按月分桶）
- 整合器配置
- 推送渠道配置
- 通知记录

## 当前实现

### 数据库类 `CCEVDatabase`

继承 `Dexie`，定义五张表：

| 表名            | 类型                 | 主键                                      | 说明                                                                          |
| --------------- | -------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| `settings`      | `AppSettings`        | `id` (固定 1)                             | 应用设置，仅一条记录                                                          |
| `klineCache`    | `KlineCacheEntry`    | `[exchangeId+symbol+timeframe]`           | K线缓存（v1 批量存储，v3 已移除）                                             |
| `klineData`     | `KlineCacheEntry`    | `[exchangeId+symbol+timeframe+timestamp]` | K线数据（v2 单条索引，v3 已移除）                                             |
| `klineBuckets`  | `KlineBucket`        | `[exchangeId+symbol+timeframe+monthKey]`  | K线数据桶（v3，嵌套字典按月分桶）                                             |
| `integrators`   | `Integrator`         | `id` (nanoid)                             | 用户整合器                                                                    |
| `channels`      | `ChannelConfig`      | `id` (nanoid)                             | 推送渠道配置                                                                  |
| `notifications` | `NotificationRecord` | `id` (nanoid)                             | 通知记录（v8 新增，`read` 为 number 0/1，因 IndexedDB 不支持 boolean 索引键） |

### 嵌套字典结构

```
exchangeId → symbol → timeframe → monthKey → { timestamp → OHLCV }
                                              ├─ "2026-06": { 1700000000: {open,high,low,close,volume}, ... }
                                              └─ "2026-07": { ... }
```

- **月分桶**：每个 `[exchangeId, symbol, timeframe, monthKey]` 是一个桶
- **桶内嵌套字典**：`Record<timestamp, KlineOHLCV>`，写入时直接覆盖，不比较新旧
- **TTL 清理**：整桶删除 `updatedAt` 超期的桶，无需逐条检查

### 核心方法

| 方法                           | 功能                                                |
| ------------------------------ | --------------------------------------------------- |
| `initSettings()`               | 首次初始化默认设置，已有则检查版本迁移              |
| `migrateSettings(old)`         | 基于版本号逐步迁移，兼容部分合并，不兼容丢弃        |
| `getStorageUsage()`            | 返回 `{ used, quota }`（利用 Storage API estimate） |
| `cleanExpiredKlineCache(ttl)`  | 清理超过 TTL 未更新的 K线桶（整桶删除）             |
| `clearKlineData()`             | 清空所有 K线桶数据                                  |
| `putKlineCandles(...)`         | 写入蜡烛到嵌套字典桶，直接覆盖，事务保证原子性      |
| `getKlineCandles(...)`         | 查询指定时间范围蜡烛，跨月桶合并，按时间戳升序      |
| `hasKlineBefore(...)`          | 检查是否存在更早的数据（用于 hasMore 判断）         |
| `exportData()`                 | 导出设置、整合器、渠道、通知（不含 K线）为 JSON     |
| `importData(json)`             | 导入 JSON 并验证数据结构                            |
| `putNotification(n)`           | 写入一条通知记录                                    |
| `getNotifications(...)`        | 分页查询通知（支持按字段排序），按时间戳降序默认    |
| `cleanExpiredNotifications(d)` | 清理超过指定天数的通知记录                          |
| `clearNotifications()`         | 清空所有通知记录                                    |
| `markNotificationRead(id)`     | 标记单条通知为已读                                  |
| `markAllNotificationsRead()`   | 标记全部通知为已读                                  |

### 版本管理

- 数据库版本独立于 `SETTINGS_VERSION`：
  - v1：初始版本，`klineCache` 按 `[exchangeId+symbol+timeframe]` 批量存储
  - v2：新增 `klineData` 按 `[exchangeId+symbol+timeframe+timestamp]` 单条索引
  - v3：废弃 `klineCache`/`klineData`，新增 `klineBuckets` 嵌套字典按月分桶，迁移时清空旧 K线缓存
- v8：新增 `notifications` 表，索引 `id, timestamp, type, source, read`
- `SETTINGS_VERSION` 仅管理设置结构的版本迁移
- 每次结构变更在 `migrateSettings` 中添加对应版本的条件分支

## 需求规范

### 数据过期与清理

- K线缓存 TTL 由用户设置（默认 7 天）
- 应用启动时执行一次过期清理（按桶 `updatedAt` 判断，整桶删除）
- 数据库体积超过 `maxDbSize` 时，优先清理最旧的 K线桶
- 利用 `navigator.storage.persist()` 请求持久化存储

### 导入/导出

- 导出：设置 + 整合器 + 渠道配置 → JSON 文件（Blob 下载）
- 导入：读取 JSON 文件 → 验证结构 → 逐表覆盖
- 不导出 K线缓存（体积大、可重新获取）
- 导入前提示用户确认（将覆盖现有数据）

### 数据完整性

- 使用 Dexie 事务确保写入原子性
- 导入时加 try-catch，格式错误时回滚并提示
- 设置页面展示 `used / quota`（格式化显示 MB/GB）

### 版本迁移

- 每次 `SETTINGS_VERSION` 递增时，`migrateSettings` 添加新分支
- 迁移规则：默认值填充新字段，已删除字段丢弃
- 迁移后 `version` 更新为新版本号
- 迁移失败时回退到默认设置

### 待扩展

- K线缓存的 LRU 淘汰策略（当前仅 TTL）
- 数据导出加密选项
- 增量同步（如用户未来需要跨设备同步）
