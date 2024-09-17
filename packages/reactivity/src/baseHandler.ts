import { hasChanged, isArray, isBoolean, isNumber, isObject } from '@vue/shared'
import { pauseTracking, resumeTracking, track, trigger } from './effect'
import { reactive } from './reactive'
import { TrackOpType, TriggerOpType } from './operations'
import { IsRaw } from './constants'

const arrayInstrumentations = {}
;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
    arrayInstrumentations[key] = function (...args) {
        // this ---> proxy
        // 1、在 proxy 里面找一次
        const proxyResult = Array.prototype[key].apply(this, args)
        if ((isBoolean(proxyResult) && proxyResult === true) || (isNumber(proxyResult) && proxyResult !== -1)) {
            return proxyResult
        }
        // 2、如果 proxy 找不到，在原始数据上再找一次
        const originResult = Array.prototype[key].apply(this[IsRaw], args)
        return originResult
    }
})
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
    // 这些会改动数组的长度，造成额外的依赖收集，因此在这些方法运行期间，暂停依赖的收集
    arrayInstrumentations[key] = function (...args) {
        pauseTracking()
        const result = Array.prototype[key].apply(this, args)
        resumeTracking()
        return result
    }
})

function createGetter() {
    return function get(target: object, key: string | symbol, receiver: object) {
        // 如果 key 的是原始对象符号属性，则返回原始对象
        if (key === IsRaw) {
            return target
        }

        // 依赖收集
        track(target, TrackOpType.GET, key)
        // 针对数组时，做出一些额外的处理
        if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
            return arrayInstrumentations[key]
        }

        const result = Reflect.get(target, key, receiver)
        // 如果result是对象，则再次进行代理
        if (isObject(result)) {
            return reactive(result)
        }
        return result
    }
}

function createSetter() {
    return function set(target: object, key: string | symbol, value: unknown, receiver: object): boolean {
        // 做一层判断，如果当前的 key 不存在于 target 上，则是新增
        const type = target.hasOwnProperty(key) ? TriggerOpType.SET : TriggerOpType.ADD
        // 当新旧值不一样 或 新增属性 才派发更新
        const oldValue = target[key]
        const oldLen = isArray(target) ? (target as []).length : undefined
        const result = Reflect.set(target, key, value, receiver)
        // 如过设置失败，则不做后续的处理
        if (!result) {
            return result
        }
        const newLen = isArray(target) ? (target as []).length : undefined
        if (hasChanged(oldValue, value) || type === TriggerOpType.ADD) {
            trigger(target, type, key, value)
            // 设置时如果满足以下三个条件，则需要手动触发 length 的依赖
            // 1、target 是数组
            // 2、key 不是 length
            // 3、设置前后的 length 值不一样
            if (isArray(target) && oldLen && newLen && oldLen !== newLen) {
                if (key !== 'length') {
                    trigger(target, TriggerOpType.SET, 'length', newLen)
                } else {
                    // 如果设置的是 length 且新的长度小于旧的，则手动触发删除操作
                    if (newLen < oldLen) {
                        // 循环派发删除
                        for (let i = newLen; i < oldLen; i++) {
                            trigger(target, TriggerOpType.DELETE, i, undefined)
                        }
                    }
                }
            }
        }
        return result
    }
}

function createHas() {
    return function has(target: object, key: string | symbol): boolean {
        // 依赖收集
        track(target, TrackOpType.HAS, key)
        const result = Reflect.has(target, key)
        return result
    }
}

function createOwnKeys() {
    return function ownKeys(target: object): (string | symbol)[] {
        track(target, TrackOpType.ITERATE, undefined)
        return Reflect.ownKeys(target)
    }
}

function createDeleteProperty() {
    return function deleteProperty(target: object, key: string | symbol): boolean {
        // 如果有这个属性且删除成功才做派发更新
        const result = Reflect.deleteProperty(target, key)
        if (target.hasOwnProperty(key) && result) {
            trigger(target, TriggerOpType.DELETE, key, undefined)
        }
        return result
    }
}

const get = createGetter()
const set = createSetter()
const has = createHas()
const ownKeys = createOwnKeys()
const deleteProperty = createDeleteProperty()

export const mutableHandlers: ProxyHandler<object> = {
    get,
    set,
    has,
    ownKeys,
    deleteProperty
}
