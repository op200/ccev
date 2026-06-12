/** 浏览器端 ws 模块桩：ccxt 用 default import，浏览器有原生 WebSocket */
const WS = globalThis.WebSocket
export default WS
