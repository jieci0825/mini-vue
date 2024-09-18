import { hasChanged } from '@vue/shared'
import { IsRef } from './constants'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { toReactive } from './reactive'
import { createDep, Dep } from './dep'

class RefImpl {
    private _value: unknown
    private _rawValue: unknown

    public deps?: Dep = undefined
    public readonly [IsRef] = true

    constructor(value: unknown, public readonly __v_isShallow: boolean) {
        this._rawValue = value
        this._value = __v_isShallow ? value : toReactive(value)
    }

    get value() {
        // 收集依赖
        trackRefValue(this)
        return this._value
    }

    set value(newValue: unknown) {
        // 如果值没有发生变化，则不进行更新
        if (!hasChanged(this._value, newValue)) {
            return
        }
        // 更新原始值
        this._rawValue = newValue
        // 根据新值时简单类型还是对象，创建对应的响应式对象
        this._value = toReactive(newValue)
        // 派发更新
        triggerRefValue(this)
    }
}

export function ref(value?: unknown) {
    return crateRef(value, false)
}

function crateRef(rawValue: unknown, shallow: boolean) {
    if (isRef(rawValue)) {
        return rawValue
    }
    return new RefImpl(rawValue, shallow)
}

export function trackRefValue(ref: RefImpl) {
    if (activeEffect) {
        // 创建一个依赖集合：ref.deps
        const deps = ref.deps || (ref.deps = createDep())
        // 再将当前激活的函数添加当前 ref 实例的 deps 里面，后续通过遍历 ref.deps 进行派发更新
        //  - 实现对 ref.value 改变时做出对应的响应式更新
        trackEffects(deps)
    }
}

export function triggerRefValue(ref: RefImpl) {
    triggerEffects(ref.deps!)
}

/**
 * 是否为 ref
 */
export function isRef(value: unknown) {
    return !!value && !!value[IsRef]
}
