import { isMap, isObject, isSet } from '@vue/shared'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers
} from './baseHandler'
import { IS_REACTIVE } from './constants'

const proxyMap = new WeakMap()

export function createReactiveObject(target, baseHandlers, proxyMap) {
  // 若不是对象且不是 Set 或者 Map，则直接返回
  if (!isObject(target) && !isSet(target) && !isMap(target)) return target

  // 若传入的普通对象已经被代理过，则返回之前的代理对象
  const existionProxy = proxyMap.get(target)
  if (existionProxy) return existionProxy

  // 若是一个代理对象，则直接返回
  if (isReactive(target)) return target

  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy)
  proxy[IS_REACTIVE] = true
  return proxy
}

export function reactive(value) {
  return createReactiveObject(value, mutableHandlers, proxyMap)
}

export function shallowReactive(value) {
  return createReactiveObject(value, shallowReactiveHandlers, proxyMap)
}

export function readonly(value) {
  return createReactiveObject(value, readonlyHandlers, proxyMap)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, shallowReadonlyHandlers, proxyMap)
}

export function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}

export function isReactive(value) {
  return isObject(value) && !!value[IS_REACTIVE]
}
