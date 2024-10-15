import { isFunction, isObject } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

export function computed(getterOrOptions) {
  const { getter, settger } = normalization(getterOrOptions)
  const computedRef = new ComputedRefImpl(getter, settger)
  return computedRef
}

function normalization(getterOrOptions) {
  let getter, settger
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
    settger = () => {
      console.warn('write operation failed: computed value is readonly')
    }
  } else if (isObject(getterOrOptions)) {
    getter = getterOrOptions.get
    settger = getterOrOptions.set
  }

  return {
    getter,
    settger
  }
}

class ComputedRefImpl {
  constructor(getter, setter) {
    this._setter = setter
    this._getter = getter
    this._value = undefined
    this._dirty = true
    this.deps = undefined // 依赖集合

    // 将getter函数变成副作用函数
    this.effect = new ReactiveEffect(getter, effect => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
  }

  get value() {
    // 这里可以简单的进行依赖收集 track(this, 'value')
    // 不过这里采用的其他方法，当 get value 触发的时候，给当前 computedRef 创建一个 deps
    // 并将当前的 activeEffect 添加到 deps 中，在 getter 依赖的响应式数据改变时，就在调度器中触发这个 deps 中的所有 effect
    trackRefValue(this)
    if (this._dirty) {
      this._value = this.effect.run()
      this._dirty = false
    }
    return this._value
  }

  set value(newValue) {
    this._setter(newValue)
  }
}
