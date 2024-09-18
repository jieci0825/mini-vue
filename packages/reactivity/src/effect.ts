import { ITERATE_KEY } from './constants'
import { createDep, Dep } from './dep'
import { TrackOpType, TriggerOpType } from './operations'

let isTracking = true

type KeyToDepMap = Map<any, Dep>

const targetMap = new WeakMap<any, KeyToDepMap>()

export let activeEffect: ReactiveEffect | undefined = undefined

export function effect<T = any>(fn: () => T) {
    const _effect = new ReactiveEffect(fn)
    _effect.run()
}

export class ReactiveEffect<T = any> {
    constructor(public fn: () => T) {}

    run() {
        activeEffect = this
        return this.fn()
    }
}

/**
 * 收集依赖
 * @param target 目标对象
 * @param type 操作类型
 * @param key 属性
 */
export function track(target: object, type: TrackOpType, key: unknown) {
    // 停止收集依赖期间或者 activeEffect 为空，则不收集
    if (!isTracking || !activeEffect) return

    // 如果是迭代类型，则 key 为空，此时则需要给 prop 赋值为指定的 symbol
    const prop = type === TrackOpType.ITERATE ? ITERATE_KEY : key
    // 以 target 为 key，获取对应的 propMap
    let propMap = targetMap.get(target)
    // 如果不存在，则创建
    if (!propMap) {
        propMap = new Map()
        targetMap.set(target, propMap)
    }
    // 使用 prop 为 key，获取对应的 dep 集合
    let deps = propMap.get(prop)
    // 如果不存在，则创建一个集合
    if (!deps) {
        deps = createDep()
        // 再将属性名和依赖的函数集合关联起来
        propMap.set(prop, deps)
    }
    // 此时在将此次收集的 activeEffect 添加到集合中
    trackEffects(deps)

    // console.log('targetMap', targetMap)
}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 * @param deps
 */
export function trackEffects(deps: Dep) {
    deps.add(activeEffect!)
}

/**
 * 派发更新
 * @param target 目标对象
 * @param type 操作的类型
 * @param key 属性
 * @param newValue 新的值
 */
export function trigger(target: object, type: TriggerOpType, key: unknown, newValue: unknown) {
    // 获取对应的 propMap
    const propMap = targetMap.get(target)
    // 根据 key 在 propMap 中获取对应的依赖集合
    const deps = propMap?.get(key)
    // 如果存在，则遍历集合，获取对应的依赖并执行
    deps && triggerEffects(deps)
}

/**
 * 依次触发 deps 中保存的依赖
 */
export function triggerEffects(deps: Dep) {
    // 依次触发
    deps.forEach(effect => {
        triggerEffect(effect)
    })
}

/**
 * 触发指定依赖
 */
export function triggerEffect(effect: ReactiveEffect) {
    effect.run()
}

/**
 * 暂停依赖收集
 */
export function pauseTracking() {
    isTracking = false
}

/**
 * 恢复依赖收集
 */
export function resumeTracking() {
    isTracking = true
}
