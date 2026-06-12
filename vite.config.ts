import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { ccxtCompatPlugin } from './src/utils/ccxt-compat-plugin'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// 读取 package.json 中的版本号，供 define 注入为编译时常量
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
)

/**
 * Node.js → 浏览器 polyfill 映射。
 * ccxt 内部依赖这些 Node.js 模块，在浏览器中需重定向到对应 polyfill 或空桩。
 */
const nodePolyfills: Record<string, string> = {
  // 浏览器原生支持或有 npm polyfill
  buffer: fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url)),
  events: fileURLToPath(new URL('./node_modules/events/events.js', import.meta.url)),
  stream: fileURLToPath(new URL('./node_modules/stream-browserify/index.js', import.meta.url)),
  util: fileURLToPath(new URL('./node_modules/util/util.js', import.meta.url)),
  assert: fileURLToPath(new URL('./node_modules/assert/build/assert.js', import.meta.url)),
  crypto: fileURLToPath(new URL('./node_modules/crypto-browserify/index.js', import.meta.url)),
  path: fileURLToPath(new URL('./node_modules/path-browserify/index.js', import.meta.url)),
  zlib: fileURLToPath(new URL('./node_modules/browserify-zlib/lib/index.js', import.meta.url)),

  // 空桩：浏览器环境不需要（ccxt 内部 try/catch 兜底）
  fs: fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  os: fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  http: fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  https: fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  net: fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  tls: fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  'http-proxy-agent': fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  'https-proxy-agent': fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  'socks-proxy-agent': fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),
  'agent-base': fileURLToPath(new URL('./src/utils/node-stub.ts', import.meta.url)),

  // WebSocket：ccxt 默认导入 ws，浏览器使用原生 WebSocket
  ws: fileURLToPath(new URL('./src/utils/ws-shim.ts', import.meta.url)),

  // ccxt 静态依赖
  'protobufjs/minimal.js': fileURLToPath(
    new URL('./node_modules/protobufjs/minimal.js', import.meta.url),
  ),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [ccxtCompatPlugin(), vue(), vueJsx(), vueDevTools()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...nodePolyfills,
    },
  },

  define: {
    // ccxt 内部可能引用 process.env，提供空对象兜底
    'process.env': '{}',
    global: 'globalThis',
    // 应用版本号，与 package.json 同步，编译期替换为字符串字面量
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  optimizeDeps: {
    // 将 ccxt 纳入预构建，配合 resolve.alias 使用 polyfill
  },

  build: {
    rolldownOptions: {
      external: [
        ...Object.keys(nodePolyfills),
        // ccxt CJS 静态依赖：避免 rolldown 尝试转换 CJS 模块
        'protobufjs/minimal.js',
        'protobufjs',
      ],
    },
  },

  ssr: {
    noExternal: ['ccxt'],
  },

  server: {},

  base: process.env.NODE_ENV === 'production' ? '/ccev/' : '/',
})
