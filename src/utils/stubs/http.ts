/** 浏览器端 http 模块桩 */
export class Agent {}
export const METHODS: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']
export const STATUS_CODES: Record<number, string> = {}
export default { Agent, METHODS, STATUS_CODES }
