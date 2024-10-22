import { hasChanged } from '@vue/shared'
import { IS_REF } from './constants'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { toReactive } from './reactive'

class RefImpl {
  constructor(rawValue, isShallow) {
    this._rawValue = rawValue
    this._isShallow = isShallow
    this._value = isShallow ? rawValue : toReactive(rawValue)
    this[IS_REF] = true
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (!hasChanged(this._value, newValue)) return
    this._rawValue = newValue
    this._value = this._isShallow ? newValue : toReactive(newValue)
    // 触发依赖
    triggerRefValue(this)
  }
}

export function ref(value) {
  return createRef(value)
}

export function shallowRef(value) {
  return createRef(value, true)
}

function createRef(rawValue, isShallow) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, isShallow)
}

export function isRef(ref) {
  return !!ref[IS_REF]
}

export function trackRefValue(refIns) {
  if (activeEffect) {
    const deps = refIns.deps || (refIns.deps = new Set())
    trackEffects(deps)
  }
}

export function triggerRefValue(refIns) {
  if (refIns.deps) {
    // 重新构造依赖集合，防止触发 delete 操作之后立马执行 add 操作，导致无限循环
    const deps = new Set(refIns.deps)
    triggerEffects(deps)
  }
}
