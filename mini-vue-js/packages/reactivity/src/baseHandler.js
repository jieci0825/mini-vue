import {
  hasChanged,
  isArray,
  isBoolean,
  isMap,
  isNumber,
  isObject,
  isSet,
  isSymbol
} from '@vue/shared'
import { pauseTracking, resumeTracking, track, trigger } from './effect'
import { ITERATE_KEY, MAP_KEY_ITERATOR_KEY, RAW_KEY } from './constants'
import { TriggerType } from './operations'
import { reactive, readonly } from './reactive'

export const mutableInstrumetations = {
  add() {
    return function (value) {
      const target = this[RAW_KEY]
      const hasKey = target.has(value)
      const result = target.add(value)
      if (!hasKey) {
        trigger(target, value, TriggerType.ADD)
      }
      return result
    }
  },
  delete() {
    return function (value) {
      const target = this[RAW_KEY]
      const hasKey = target.has(value)
      const result = target.delete(value)
      if (hasKey) {
        trigger(target, value, 'DELETE')
      }
      return result
    }
  },
  get(isShallow, isReadonly) {
    return function (key) {
      const target = this[RAW_KEY]
      const had = target.has(key)
      track(target, key)
      if (had) {
        const result = target.get(key)
        if (isObject(result)) {
          // 如果是只读且是深响应的数据，则调用 readonly
          if (!isShallow && isReadonly) {
            return readonly(result)
          }
          // 如果是浅响应的数据，则直接返回
          else if (isShallow) {
            return result
          }
          // 如果都不是，则作为深响应数据处理
          return reactive(result)
        } else {
          return result
        }
      }
    }
  },
  set() {
    return function (key, value) {
      const target = this[RAW_KEY]
      const had = target.has(key)
      const oldValue = target.get(key)
      const rawValue = value[RAW_KEY] || value
      target.set(key, rawValue)
      if (!had) {
        trigger(target, key, TriggerType.ADD)
      } else {
        if (hasChanged(oldValue, rawValue)) {
          trigger(target, key, TriggerType.SET)
        }
      }
    }
  },
  forEach() {
    return function (callback, thisArg) {
      const target = this[RAW_KEY]
      track(target, ITERATE_KEY)
      target.forEach((v, k) => {
        callback.call(thisArg, reactive(v), reactive(k), this)
      })
    }
  },
  [Symbol.iterator]: iterationMethod,
  entries: iterationMethod,
  keys: keysIterationMethod,
  values: valuesIterationMethod
}

function valuesIterationMethod() {
  return function () {
    const target = this[RAW_KEY]
    const wrap = v => {
      if (isObject(v)) {
        return reactive(v)
      }
      return v
    }
    const iterator = target.values()

    track(target, ITERATE_KEY)

    return {
      next() {
        const { value, done } = iterator.next()
        return {
          // 仅会获取 value，所以只需要针对 value 进行包装
          value: wrap(value),
          done
        }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}

function keysIterationMethod() {
  return function () {
    const target = this[RAW_KEY]
    const iterator = target.keys()

    // 更改依赖建立关系
    track(target, MAP_KEY_ITERATOR_KEY)

    return {
      next() {
        const { value, done } = iterator.next()
        return {
          value: reactive(value),
          done
        }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}

function iterationMethod() {
  return function () {
    const target = this[RAW_KEY]
    const wrap = v => {
      if (isObject(v)) {
        return reactive(v)
      }
      return v
    }
    const iterator = target[Symbol.iterator]()

    track(target, ITERATE_KEY)

    return {
      next() {
        const { value, done } = iterator.next()
        return {
          value: value ? [wrap(value[0]), wrap(value[1])] : value,
          done
        }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}

const arrayInstrumentations = {}
;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  arrayInstrumentations[key] = function (...args) {
    // this ---> proxy
    // 1、在 proxy 里面找一次
    const proxyResult = Array.prototype[key].apply(this, args)
    // 如果在代理中找到的结果为 true 或者不等于 -1，表示找到了，直接返回
    if (
      (isBoolean(proxyResult) && proxyResult === true) ||
      (isNumber(proxyResult) && proxyResult !== -1)
    ) {
      return proxyResult
    }
    // 2、在原始数组中找一次
    const rawResult = Array.prototype[key].apply(this[RAW_KEY], args)
    // 直接返回原始数组中的结果
    return rawResult
  }
})
// 在重写一些方法
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  // 这些会改动数组的长度，造成额外的依赖收集，因此在这些方法运行期间，暂停依赖的收集
  arrayInstrumentations[key] = function (...args) {
    // 暂停依赖收集
    pauseTracking()
    const result = Array.prototype[key].apply(this, args)
    // 恢复依赖收集
    resumeTracking()
    return result
  }
})

class BaseReactiveHandler {
  // isShallow 是否浅响应 false: 深响应 true: 浅响应
  // isReadonly 是否只读 false: 非只读 true: 只读
  constructor(isShallow = false, isReadonly = false) {
    this.isShallow = isShallow
    this.isReadonly = isReadonly
  }

  get(target, key, receiver) {
    if (key === RAW_KEY) {
      return target
    }

    // 如果访问的是重新的数组方法，则直接使用重新的方法
    if (isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    if (isSet(target) || isMap(target)) {
      if (key === 'size') {
        track(target, ITERATE_KEY)
        return Reflect.get(target, key, target)
      }
      return mutableInstrumetations[key](this.isShallow, this.isReadonly)
    }

    const result = Reflect.get(target, key, receiver)

    // symbol类型属性不进行依赖收集
    if (isSymbol(key)) {
      return result
    }

    // 非只读，收集依赖
    if (!this.isReadonly) {
      track(target, key)
    }

    // 浅响应
    if (this.isShallow) {
      return result
    }

    // 深响应
    if (isObject(result)) {
      return this.isReadonly ? readonly(result) : reactive(result)
    }

    return result
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    // 表示深/浅响应，非只读
    super(isShallow, false)
  }

  set(target, key, newValue, receiver) {
    // 获取旧值
    const oldValue = target[key]
    // 获取旧值的长度
    const oldLen = isArray(target) ? target.length : 0

    // 检测当前属性是否存在，如果不存在表示为新增
    let type = Object.prototype.hasOwnProperty.call(target, key)
      ? TriggerType.SET
      : TriggerType.ADD

    const result = Reflect.set(target, key, newValue, receiver)
    if (!result) return false

    // 获取修改后的数组长度
    const newLen = isArray(target) ? target.length : 0

    // 只有代理的原始对象与 target 相等时，才触发依赖
    if (receiver[RAW_KEY] === target) {
      // 发生变化时触发依赖
      if (hasChanged(oldValue, newValue)) {
        // 如果是数组，且 key 不是 length，并且修改后的数组长度大于旧值，则表示通过设置了过大的索引导致新增，改变了 length 属性
        if (isArray(target) && key !== 'length' && newLen > oldLen) {
          type = TriggerType.ADD
        }
        trigger(target, key, type, newValue)
      }
    }

    return result
  }

  has(target, key) {
    track(target, key)
    return Reflect.has(target, key)
  }

  ownKeys(target) {
    const key = isArray(target) ? 'length' : ITERATE_KEY
    track(target, key)
    return Reflect.ownKeys(target)
  }

  deleteProperty(target, key) {
    // 检测属性是否存在
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.deleteProperty(target, key)
    // 属性存在和删除成功，则触发依赖
    if (hadKey && result) {
      trigger(target, key, TriggerType.DELETE)
    }
    return result
  }
}

class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    // 表示深/浅响应，只读
    super(isShallow, true)
  }

  set(target, key) {
    console.warn(`key: ${key} set 失败，因为 target 是 readonly`, target)
    return true
  }

  deleteProperty(target, key) {
    console.warn(`key: ${key} delete 失败，因为 target 是 readonly`, target)
    return true
  }
}

// Proxy的handler
export const mutableHandlers = new MutableReactiveHandler()

// 浅响应
export const shallowReactiveHandlers = new MutableReactiveHandler(true)

// 只读-深
export const readonlyHandlers = new ReadonlyReactiveHandler()

// 只读-浅
export const shallowReadonlyHandlers = new BaseReactiveHandler(true)
