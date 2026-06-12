/**
 * Vite 插件：处理 ccxt 内部 CJS 依赖的 ESM 兼容问题。
 * intercept 特定 ccxt 路径，返回 ESM shim。
 */
import type { Plugin } from 'vite'

export function ccxtCompatPlugin(): Plugin {
  return {
    name: 'ccxt-compat',
    enforce: 'pre',

    resolveId(id, importer) {
      if (!importer) return
      // 拦截 dydx-v4-client 对 long/index.cjs 的引用
      if (id.endsWith('long/index.cjs') && importer.includes('dydx-v4-client')) {
        return '\0ccxt-shim:long'
      }
      return null
    },

    load(id) {
      if (id === '\0ccxt-shim:long') {
        return "import Long from 'long'\nexport default Long\nexport { Long }\n"
      }
      return null
    },
  }
}
