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
 * Node.js → 浏览器 polyfill / stub 映射。
 * ccxt 同时使用裸标识符（如 'http'）和 node: 前缀（如 'node:http'），
 * 两者都需映射到对应 polyfill 或 stub，避免 Vite 将 node: 模块 externalize。
 */
const nodePolyfills: Record<string, string> = {
  // ── 有浏览器 polyfill 的模块（裸标识符 + node: 前缀） ──
  buffer: fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url)),
  'node:buffer': fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url)),
  events: fileURLToPath(new URL('./node_modules/events/events.js', import.meta.url)),
  'node:events': fileURLToPath(new URL('./node_modules/events/events.js', import.meta.url)),
  inherits: fileURLToPath(new URL('./node_modules/inherits/inherits_browser.js', import.meta.url)),
  stream: fileURLToPath(new URL('./node_modules/stream-browserify/index.js', import.meta.url)),
  'node:stream': fileURLToPath(
    new URL('./node_modules/stream-browserify/index.js', import.meta.url),
  ),
  util: fileURLToPath(new URL('./node_modules/util/util.js', import.meta.url)),
  'node:util': fileURLToPath(new URL('./node_modules/util/util.js', import.meta.url)),
  assert: fileURLToPath(new URL('./node_modules/assert/build/assert.js', import.meta.url)),
  'node:assert': fileURLToPath(new URL('./node_modules/assert/build/assert.js', import.meta.url)),
  crypto: fileURLToPath(new URL('./node_modules/crypto-browserify/index.js', import.meta.url)),
  'node:crypto': fileURLToPath(
    new URL('./node_modules/crypto-browserify/index.js', import.meta.url),
  ),
  path: fileURLToPath(new URL('./node_modules/path-browserify/index.js', import.meta.url)),
  'node:path': fileURLToPath(new URL('./node_modules/path-browserify/index.js', import.meta.url)),
  zlib: fileURLToPath(new URL('./node_modules/browserify-zlib/lib/index.js', import.meta.url)),
  'node:zlib': fileURLToPath(
    new URL('./node_modules/browserify-zlib/lib/index.js', import.meta.url),
  ),

  // ── 仅浏览器桩的模块（裸标识符 + node: 前缀） ──
  fs: fileURLToPath(new URL('./src/utils/stubs/fs.ts', import.meta.url)),
  'node:fs': fileURLToPath(new URL('./src/utils/stubs/fs.ts', import.meta.url)),
  os: fileURLToPath(new URL('./src/utils/stubs/os.ts', import.meta.url)),
  'node:os': fileURLToPath(new URL('./src/utils/stubs/os.ts', import.meta.url)),
  http: fileURLToPath(new URL('./src/utils/stubs/http.ts', import.meta.url)),
  'node:http': fileURLToPath(new URL('./src/utils/stubs/http.ts', import.meta.url)),
  https: fileURLToPath(new URL('./src/utils/stubs/https.ts', import.meta.url)),
  'node:https': fileURLToPath(new URL('./src/utils/stubs/https.ts', import.meta.url)),
  net: fileURLToPath(new URL('./src/utils/stubs/net.ts', import.meta.url)),
  'node:net': fileURLToPath(new URL('./src/utils/stubs/net.ts', import.meta.url)),
  tls: fileURLToPath(new URL('./src/utils/stubs/tls.ts', import.meta.url)),
  'node:tls': fileURLToPath(new URL('./src/utils/stubs/tls.ts', import.meta.url)),
  url: fileURLToPath(new URL('./src/utils/stubs/url.ts', import.meta.url)),
  'node:url': fileURLToPath(new URL('./src/utils/stubs/url.ts', import.meta.url)),

  // ccxt 代理相关依赖
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

  server: {},

  build: {
    // ccxt (~5.4MB)、monaco-editor (~4.1MB)、ts.worker (~6.9MB) 本身体量巨大，
    // 无法再拆分，上调阈值避免对预期大 chunk 产生警告
    chunkSizeWarningLimit: 7000,
    rolldownOptions: {
      output: {
        // 启用 Rolldown 代码分割，将动态导入的模块拆分为独立 chunk
        codeSplitting: true,
      },
    },
  },

  base: process.env.NODE_ENV === 'production' ? '/ccev/' : '/',
})
