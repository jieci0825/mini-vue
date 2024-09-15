import { mutableHandlers } from './baseHandler'

export const reactiveMap = new WeakMap<object, any>()

export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}

function createReactiveObject(target: object, mutableHandlers: ProxyHandler<any>, reactiveMap: WeakMap<object, any>) {}
