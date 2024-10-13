import { mutableHandlers } from './baseHandler'

export function reactive(target) {
    const proxy = new Proxy(target, mutableHandlers)
    return proxy
}
