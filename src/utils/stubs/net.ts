/** 浏览器端 net 模块桩 */
export function isIP(_input: string): number {
  return 0
}
export function isIPv6(_input: string): boolean {
  return false
}
export function connect(..._args: unknown[]): undefined {
  return undefined
}
export class Socket {
  writable = false
  constructor(_options?: Record<string, unknown>) {}
}
export default { isIP, isIPv6, connect, Socket }
