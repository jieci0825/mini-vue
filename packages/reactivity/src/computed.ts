import { isFunction } from '@vue/shared'
import { IsRef } from './constants'
import { createDep, Dep } from './dep'
import { ReactiveEffect, triggerEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

interface ComputedGetter<T> {
    (): T
}

interface ComputedSetter<T> {
    (value: T): void
}

interface WritableComputedGetter<T> {
    get: ComputedGetter<T>
    set: ComputedSetter<T>
}

export class ComputedRefImpl<T> {
    private _getter: ComputedGetter<T>
    private _setter: ComputedSetter<T>
    private _value!: T

    public effect: ReactiveEffect<T>
    public deps?: Dep = undefined
    public _dirty = true
    public readonly [IsRef] = true

    constructor(getter: ComputedGetter<T>, setter: ComputedSetter<T>) {
        this._getter = getter
        this._setter = setter
        // 将 getter 作为当前 effect 的执行函数
        this.effect = new ReactiveEffect<T>(getter, effect => {
            // 当计算属性 getter 中依赖的值发生改变时，就会重新执行 effect，在这里就是执行这个调度器，此时我们利用调度器手动控制更新时机
            if (!this._dirty) {
                this._dirty = true
                // 派发更新
                triggerRefValue(this)
            }
        })
        this.effect.computed = this
    }

    get value() {
        // 收集依赖
        trackRefValue(this)
        // 数据脏了才会重新获取
        if (this._dirty) {
            this._dirty = false
            this._value = this.effect.run()
        }
        return this._value
    }

    set value(newValue) {
        this._setter(newValue)
    }
}

export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedGetter<T>) {
    const { getter, setter } = normalization(getterOrOptions)

    const cRef = new ComputedRefImpl<T>(getter, setter)

    return cRef
}

/**
 * 参数归一化处理 getter 和 setter
 */
function normalization<T>(getterOrOptions: ComputedGetter<T> | WritableComputedGetter<T>) {
    let getter: ComputedGetter<T>
    let setter: ComputedSetter<T>
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions as ComputedGetter<T>
        setter = () => {
            console.warn('write operation failed: computed value is readonly')
        }
    } else {
        const _getterOrOptions = getterOrOptions as WritableComputedGetter<T>
        getter = _getterOrOptions.get
        setter = _getterOrOptions.set
    }

    return { getter, setter }
}
