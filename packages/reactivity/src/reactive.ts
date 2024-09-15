import { isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandler'

export const reactiveMap = new WeakMap<object, any>()

export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}

function createReactiveObject(target: object, baseHandlers: ProxyHandler<any>, proxyMap: WeakMap<object, any>) {
    // 如果 target 不是对象，直接返回
    if (!isObject(target)) {
        return target
    }
    // 如果 target 已经被代理过，直接返回
    const existingProxy = proxyMap.get(target)
    if (existingProxy) {
        return existingProxy
    }
    // 创建代理对象
    const proxy = new Proxy(target, baseHandlers)
    // 将代理对象和 target 存储到 proxyMap 中
    proxyMap.set(target, proxy)
    // 返回代理对象
    return proxy
}
