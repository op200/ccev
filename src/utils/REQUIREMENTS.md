# 工具函数模块 (utils)

## 职责

提供交易所 API 封装和通用格式化工具函数。

## 子模块

### `ccxt.ts` — 交易所 API 封装

**背景：** ccxt 库不含浏览器构建，无法在 Vite 浏览器端直接 `import`。K线数据通过原生 fetch + REST API 获取。所有符号统一使用 ccxt 格式（如 `BTC/USDT:USDT`），API 调用前自动转换为交易所原生格式。

**常量：**
| 常量 | 说明 |
|------|------|
| `SUPPORTED_EXCHANGE_IDS` | 支持的交易所 ID 列表（13 个） |
| `EXCHANGE_META` | 交易所元数据（名称、WS 支持、线性合约支持） |
| `EXCHANGE_API_BASE` | 各交易所 REST API 基础 URL（仅用于交易对/ticker 查询） |

**函数：**
| 函数 | 说明 |
|------|------|
| `getExchangeIds()` | 返回所有支持的交易所 ID |
| `getExchangeInfo(id)` | 获取交易所信息（同步，静态数据） |
| `getExchangeInfoCached(id)` | 带缓存的交易所信息获取 |
| `getLinearSymbols(id)` | 获取某交易所的 USDT 本位合约交易对 |
| `fetchTickers(id)` | 获取某交易所的全量 Ticker |
| `exchangeSupportsWs(id)` | 检查交易所是否支持 WebSocket |

**交易所列表：**
okx, binance, bybit, bitget, gate, kucoin, mexc, bingx, bitmart, htx, coinbase, kraken, deribit

---

### `format.ts` — 格式化工具

**常量：**
| 常量 | 说明 |
|------|------|
| `TIMEFRAME_MS` | 各周期对应的毫秒数 |
| `TIMEFRAME_LABELS` | 各周期的 UI 显示标签 |

**函数：**
| 函数 | 说明 |
|------|------|
| `formatPrice(price, decimals?)` | 自动精度价格格式化（大额少位、小额的到位） |
| `formatVolume(volume)` | 成交量格式化（K/M/B 后缀） |
| `formatPercent(percent)` | 百分比格式化（带正负号） |
| `formatTimestamp(ts)` | 时间戳格式化 |
| `formatBytes(bytes)` | 字节格式化（用于存储占用显示） |
| `toChartData(klines)` | K线数据转为 lightweight-charts 格式 |

### `api-docs.ts` — API 文档动态生成器

**职责：** 根据整合器 API 类型定义和用户编写的代码，自动生成 API 文档。

**核心逻辑：**

1. **API Schema 定义（`API_SCHEMA`）**：以 `Record<string, APISchemaEntry>` 维护完整的 API 清单（含类型、参数、描述、默认示例）。API 变更时只需修改此处。
2. **代码解析（`detectUsedApis`）**：正则匹配 + 解构赋值检测，识别用户代码中实际调用了哪些 API 和引用了哪些 context 属性。
3. **示例提取（`extractExamples`）**：从代码中提取真实使用示例（最多 3 条），优先于默认示例展示。
4. **文档生成（`generateApiDocs`）**：输出分类结果 — `used`（已使用）和 `available`（可用但未使用）。

**导出函数：**

| 函数                         | 说明                                |
| ---------------------------- | ----------------------------------- |
| `generateApiDocs(code)`      | 根据整合器代码生成分类文档          |
| `getAllApiDocs()`            | 获取全部 API 文档（不检测使用情况） |
| `getFullTypesReference()`    | 获取完整的类型参考文档              |
| `getTypesReferenceByGroup()` | 获取按分组组织的类型参考            |

**类型参考覆盖：** 沙箱 API（`IntegratorAPI`）、上下文（`IntegratorContext`, `IntegratorOutput`）、K线数据（`KlineData`, `KlineTimeframe`, `KlineFetchParams`）、推送渠道（`ChannelType`, `ChannelConfig`）、整合器（`Integrator`, `IntegratorExecutionResult`）

## 需求规范

### ccxt API 封装

- 优先使用交易所 WebSocket API（OKX、Binance 等均支持）
- WebSocket 不可用时降级为 REST API 轮询
- REST API 请求使用 `fetch` + `AbortController` 支持超时
- K线分页采用惰性加载：先取最新 N 条，滚动到底部时自动加载更早数据
- 仅获取 USDT 本位永续合约（`swap` 类型，`linear` 为 true）

### WebSocket 连接管理

- 每个交易所最多一个 WS 连接（复用）
- 连接断开自动重连（指数退避：1s → 2s → 4s → ... → max 30s）
- 页面不可见时（`visibilitychange`）暂停 WS，可见时恢复
- 切换交易对时动态修改订阅频道（无需重连）

### 格式化函数

- 纯函数，无副作用
- 输入为 `number`，输出为 `string`
- 考虑边界情况（0、NaN、Infinity）
- 不要输出过多小数位
- `TIMEFRAME_MS` 提供各周期精确毫秒数，供时间计算使用

### 待扩展

- 更多交易所 REST/WS API 适配
- K线数据去重（WS 与 REST 交叉数据）
- 请求频率限制（rate limiting）防止交易所封 IP
