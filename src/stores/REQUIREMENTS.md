# 状态管理模块 (stores)

## 职责

基于 Pinia 管理应用全局状态，包括：

- 设置数据
- 交易所信息与状态
- K线数据获取与缓存
- 整合器管理与执行

## Store 清单

### `useSettingsStore` (`stores/settings.ts`)

**状态：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `settings` | `Ref<AppSettings>` | 完整设置对象 |
| `loading` | `Ref<boolean>` | 初始加载状态 |
| `dbUsage` | `Ref<{ used, quota }>` | 数据库占用信息 |

**计算属性：** `enabledExchanges`, `channels`, `cacheSettings`, `fetcherSettings`

**方法：**
| 方法 | 说明 |
|------|------|
| `init()` | 从 IndexedDB 加载设置，获取存储用量 |
| `updateSettings(partial)` | 部分更新设置并持久化 |
| `updateCacheSettings(partial)` | 更新缓存设置 |
| `updateFetcherSettings(partial)` | 更新获取器设置 |
| `setLanguage(locale)` | 切换语言（联动 i18n + 持久化） |
| `setTheme(theme)` | 切换主题（联动 NaiveUI + DOM） |
| `toggleExchange(id)` | 切换交易所启用状态 |
| `addChannel(channel)` | 添加推送渠道 |
| `removeChannel(id)` | 移除推送渠道 |
| `exportData()` | 导出一键备份数据 |
| `importData(json)` | 导入恢复数据 |
| `refreshDbUsage()` | 刷新存储用量 |

---

### `useExchangeStore` (`stores/exchange.ts`)

**状态：** `exchanges`, `symbols`, `connectionStatus`, `loading`, `allExchangeIds`

**方法：**
| 方法 | 说明 |
|------|------|
| `initExchanges()` | 获取所有支持的交易所 ID 列表 |
| `loadExchangeInfo(id)` | 加载单个交易所元信息并更新连接状态 |
| `loadSymbols(id)` | 异步获取指定交易所的线性合约交易对 |
| `getSymbols(id)` | 同步获取已缓存的交易对 |
| `searchSymbols(id, query)` | 按关键词搜索交易对（大小写不敏感） |

**连接状态流转：** `disconnected → connecting → connected | error`

---

### `useKlineStore` (`stores/kline.ts`)

**架构：** 两级数据源，数据库使用嵌套字典按月分桶。

| 路径                   | 数据源                | 说明                                                                |
| ---------------------- | --------------------- | ------------------------------------------------------------------- |
| 初始加载 `fetchKlines` | DB 缓存 → API         | 优先 DB 跨会话缓存，不足则调 API                                    |
| 分页加载 `loadMore`    | **直接 API**          | 不再查 DB（避免缓存脏数据导致时间戳漂移），API 返回后写 DB 异步缓存 |
| 实时更新               | WebSocket / HTTP 轮询 | 更新最新蜡烛                                                        |

所有入口（REST API、WebSocket）在写入 DB 前统一经 `normalizeTimestamp()` 归一化到毫秒。

**DB 嵌套字典结构：**

```
klineBuckets: [exchangeId+symbol+timeframe+monthKey] → { candles: Record<timestamp, KlineOHLCV>, updatedAt }
```

- 写入：`putKlineCandles(exchangeId, symbol, tf, { [ts]: {...} })`，直接覆盖旧数据，事务保证原子性
- 读取：`getKlineCandles(exchangeId, symbol, tf, from?, to?, limit?)`，跨月桶合并，按时间戳升序
- hasMore：`hasKlineBefore(exchangeId, symbol, tf, beforeTs)`，检查月桶中是否有更早数据

**状态：** `klines`, `loading`, `currentParams`, `wsConnected`, `hasMore`

**方法：**
| 方法 | 说明 |
|------|------|
| `fetchKlines(params)` | DB 缓存查最新 N 条 → 不足则 API → 写 DB 桶 → `klines.value` |
| `loadMore()` | 直接调 API（`endTime`=最旧时间戳）→ `Set` 去重 → 异步写 DB 桶 → 前插 `klines.value` |
| `handleWsUpdate(kline)` | 写 DB 桶 + 更新/追加内存最新蜡烛 |

**去重策略：**

- `loadMore` 构建当前 `klines.value` 全部时间戳的 `Set<number>`
- API 返回数据经 Set 过滤后前插，确保绝不重复
- 不再依赖 DB 查询去重（热路径不查 DB）

**hasMore 判定：**

- API 返回量 ≥ 请求量 → `hasMore=true`，否则 `false`
- 初始加载 DB 缓存命中时，通过 `db.hasKlineBefore()` 检查月桶中是否还有更早记录

**数据完整性保证：**

- **时间戳归一化**：所有入口（REST API、WebSocket）调用 `normalizeTimestamp(ts)`，`ts < 1e12` 则 ×1000 转毫秒
- DB 中时间戳始终为毫秒，读取无需二次归一化
- 复合主键 `[exchangeId+symbol+timeframe+monthKey]` 保证桶唯一性
- 桶内直接覆盖写入，不比较新旧数据
- 数据不存在时日志报错，不生成虚假数据

---

### `useIntegratorStore` (`stores/integrator.ts`)

**状态：** `integrators`, `executionResults`, `loading`

**计算属性：** `enabledIntegrators`

**方法：**
| 方法 | 说明 |
|------|------|
| `loadIntegrators()` | 从 DB 加载所有整合器，首次无数据时自动种子默认整合器 |
| `seedDefaultIntegrators()` | 将预设的 7 个默认整合器写入 DB（使用各自的 enabled 字段，仅在 DB 为空时由 `loadIntegrators` 调用） |
| `createIntegrator(data)` | 新建整合器（nanoid 生成 ID） |
| `updateIntegrator(id, data)` | 更新整合器配置（含启用/禁用开关，自动写入 IndexedDB 持久化） |
| `deleteIntegrator(id)` | 删除整合器 |
| `executeIntegrator(id, context)` | 在沙箱中执行整合器代码，触发通知时回调 WebUI 弹窗 |
| `setNotificationHandler(handler)` | 注入 WebUI 通知回调（由页面组件调用，将 api.sendToAllChannels 转为 NaiveUI notification） |

---

### `useCounterStore` (`stores/counter.ts`)

示例 Store（模板生成），后续可能移除。

## 需求规范

### Store 设计原则

- 使用 Pinia Setup Store 语法（`defineStore('name', () => { ... })`）
- 禁止 Options Store 语法
- 每个 Store 一个文件，职责单一
- 计算属性用 `computed`，异步操作返回 Promise
- 涉及持久化的操作通过 `db` 模块，不直接操作 Dexie

### 数据流

```
用户操作 → Store 方法 → db 模块 → IndexedDB
                    ↓
               响应式状态更新 → Vue 组件自动重渲染
```

### WebSocket 集成

- Kline Store 负责 WebSocket 连接生命周期
- WS 收到数据后更新 `klines` 最新一根
- 连接断开自动重连（指数退避）
- 切换交易对/周期时先取消旧订阅再建立新订阅

### 错误处理

- 所有异步操作加 try-catch
- 失败时不影响已有数据展示
- 使用 NaiveUI 的 `useMessage` 提示用户错误信息
