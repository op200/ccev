# 类型定义模块 (types)

## 职责

定义全局 TypeScript 类型接口，作为整个项目的数据契约。所有模块的类型都从此处导出，确保类型一致性。

## 子模块

### `index.ts`

统一导出入口，汇聚所有子模块类型。

### `exchange.ts` — 交易所类型

- `ExchangeId`: 交易所 ID 字符串类型
- `ExchangeInfo`: 交易所元信息（名称、是否支持 WebSocket、是否支持线性合约）
- `SymbolInfo`: 交易对信息（交易对名、基础币、计价币、类型、是否 USDT 本位）
- `ConnectionStatus`: 连接状态枚举（`disconnected | connecting | connected | error`）

### `kline.ts` — K线数据类型

- `KlineTimeframe`: 时间周期（`1m | 5m | 15m | 30m | 1h | 4h | 1d | 1w | 1M`）
- `KlineData`: OHLCV 单条 K线数据（时间戳、开高低收量），供内存和 API 使用
- `KlineOHLCV`: OHLCV 数据（不含时间戳），作为嵌套字典的 value
- `MonthKey`: 月分桶 Key（`YYYY-MM` 格式字符串）
- `KlineBucket`: v3 数据库嵌套字典桶（exchangeId + symbol + timeframe + monthKey → `Record<timestamp, KlineOHLCV>`），写入时直接覆盖
- `KlineCacheEntry`: v1/v2 旧格式缓存条目（已废弃，保留兼容）
- `KlineFetchParams`: 分页查询参数
- `KlineUpdate`: WebSocket 实时 K线更新

### `settings.ts` — 设置类型

- `AppSettings`: 应用设置主结构（包含版本号、启用的交易所、默认交易所/交易对/周期、语言、主题、渠道列表、缓存设置、获取器设置）
- `CacheSettings`: 缓存策略（最大条数、TTL 过期时间、最大体积）
- `FetcherSettings`: 数据获取策略（分页大小、分页间隔、是否启用 WS、超时）
- `DEFAULT_SETTINGS`: 默认设置常量
- `SETTINGS_VERSION`: 当前设置版本号（用于迁移）

### `integrator.ts` — 整合器类型

- `Integrator`: 整合器定义（ID、名称、描述、代码、语言、启用状态、关联渠道、时间戳）
- `IntegratorContext`: 执行上下文（K线数组、交易所、交易对、周期）
- `IntegratorOutput`: 执行输出（是否通知、标题、内容、附加数据）
- `IntegratorAPI`: 沙箱内可用 API（发送渠道消息、获取K线、日志）
- `IntegratorExecutionResult`: 执行结果（成功/失败、输出、错误信息、执行时间）
- `APIDocItem` / `APIParamDoc`: API 文档生成的数据结构

### `channel.ts` — 推送渠道类型

- `ChannelType`: 渠道类型（`dingtalk | feishu | email | custom`）
- `ChannelConfig`: 渠道配置主结构（ID、类型、名称、启用状态、类型特定配置）
- `DingTalkConfig`: 钉钉机器人配置（webhook URL、可选 secret）
- `FeishuConfig`: 飞书机器人配置
- `EmailConfig`: 邮箱配置（SMTP 主机/端口、用户名/密码、收件人列表）
- `CustomChannelConfig`: 自定义渠道配置（URL、HTTP 方法、请求头、消息体模板）
- `ChannelTypeMeta`: 渠道类型元数据（用于 UI 展示）

### `integrator-defaults.ts` — 默认整合器常量

- `DefaultIntegratorInput`: 创建默认整合器的输入参数类型（不含 `id`、`createdAt`、`updatedAt` 等自动生成字段）
- `DEFAULT_INTEGRATORS`: 预设的 6 个默认整合器列表，涵盖价格突破、成交量异动、RSI、均线交叉、涨跌幅告警、多指标共振等常见策略

## 规范要求

- 所有类型必须以 `type` 或 `interface` 严格定义，禁止 `any`
- 导出使用 `export *` 聚合到 `index.ts`
- 类型命名遵循 PascalCase
- 字段使用 JSDoc `/** */` 注释说明含义
- 常量值（如默认设置）直接定义在此模块，保持数据契约集中
- 版本号 `SETTINGS_VERSION` 每次数据结构变更时递增
