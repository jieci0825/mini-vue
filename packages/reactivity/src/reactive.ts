import { isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandler'
import { IsReactive } from './constants'

export const reactiveMap = new WeakMap<object, any>()

export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}

function createReactiveObject(target: object, baseHandlers: ProxyHandler<any>, proxyMap: WeakMap<object, any>) {
    // 如果 target 不是对象，直接返回
    if (!isObject(target)) {
        return target
    }
    // 如果 target 就是一个代理对象，则直接返回
    if (isReactive(target)) {
        return target
    }

    // 如果 target 之前以前被代理过了，直接返回之前缓存的代理对象
    const existingProxy = proxyMap.get(target)
    if (existingProxy) {
        return existingProxy
    }
    // 创建代理对象
    const proxy = new Proxy(target, baseHandlers)
    // 将代理对象和 target 存储到 proxyMap 中
    proxyMap.set(target, proxy)
    proxy[IsReactive] = true
    // 返回代理对象
    return proxy
}

function isReactive(target: any) {
    return !!(target && target[IsReactive])
}
