/// <reference types="vite/client" />

/** Vite define 注入的应用版本号，与 package.json 自动同步 */
declare const __APP_VERSION__: string

declare global {
  interface Window {
    hljs?: typeof import('highlight.js').default
  }
}

export {}
