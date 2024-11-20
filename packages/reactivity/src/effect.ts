import { ITERATE_KEY } from './constants'
import { createDep, Dep } from './dep'
import { TrackOpType, TriggerOpType } from './operations'
import { ComputedRefImpl } from './computed'
import { extend } from '@vue/shared'

let shouldTrack = true

type KeyToDepMap = Map<any, Dep>

const targetMap = new WeakMap<any, KeyToDepMap>()

export let activeEffect: ReactiveEffect | undefined = undefined
const effectStack: ReactiveEffect[] = []

interface ReactiveEffectOptions {
    lazy?: boolean
    scheduler?: (effect: ReactiveEffect) => void
}
export function effect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions = {}
) {
    const defaultOptions = {
        lazy: false
    }
    options = extend(defaultOptions, options)

    const _effect = new ReactiveEffect(fn, options.scheduler)

    if (options.lazy === true) {
        return _effect.run.bind(_effect)
    } else {
        _effect.run()
    }
}

export type EffectScheduler = (effect: ReactiveEffect) => void

export class ReactiveEffect<T = any> {
    public active: boolean = true // 默认激活
    computed?: ComputedRefImpl<T>
    scheduler?: EffectScheduler
    depSetList: Dep[] = [] // [Set<Dep>, Set<Dep>, Set<Dep>] 将所有的依赖集合(Set)存储到这个数组中
    constructor(
        public fn: () => T,
        scheduler: EffectScheduler | undefined = undefined
    ) {
        if (scheduler) {
            this.scheduler = scheduler
        }
        this.fn = fn
    }

    run() {
        // 非激活状态下只需要执行函数，不需要进行依赖收集
        if (!this.active) {
            return this.fn()
        }

        // 激活状态下才需要进行依赖收集
        //  - 非激活状态下就不会把 activeEffect 进行赋值，activeEffect 为空，所以不会进行依赖收集
        activeEffect = this
        // 收集新的依赖之前，清除之前的依赖
        cleanupEffect(this)
        effectStack.push(this)
        try {
            // 执行 fn，收集依赖
            return this.fn()
        } finally {
            // 执行完 fn 后，将 activeEffect 置为 undefined
            // activeEffect = undefined
            // 直接置空会导致嵌套 effect 出现问题，会让最内层的effect执行完成之后，外层后续还有effect执行时，activeEffect为undefined
            // 所以采用执行栈来解决
            // 1. 删除最后一个effect
            effectStack.pop()
            // 2. 将执行删除操作后的最后一个effect赋值给activeEffect
            activeEffect = effectStack[effectStack.length - 1]
        }
    }

    stop() {
        if (this.active) {
            // 清空依赖
            cleanupEffect(this)
            // 停止依赖收集
            this.active = false
        }
    }

    resume() {
        if (!this.active) {
            this.active = true
            this.fn() // 重新执行 effect
        }
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
    if (!shouldTrack || !activeEffect) return

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
}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 */
export function trackEffects(deps: Dep) {
    if (!deps.has(activeEffect!)) {
        deps.add(activeEffect!)
        // 同时本次的 deps 也需要添加到 activeEffect 的 depList 中
        //  - 保证后续每次执行之前能实现在所有的 Set<Dep> 中能精准的清空当前函数的依赖
        //  - 即记录下来这个要执行的依赖出现过在哪些集合里面
        activeEffect!.depSetList.push(deps)
    }
}

/**
 * 派发更新
 * @param target 目标对象
 * @param type 操作的类型
 * @param key 属性
 * @param newValue 新的值
 */
export function trigger(
    target: object,
    type: TriggerOpType,
    key: unknown,
    newValue: unknown
) {
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
    if (!deps) return

    // 依次触发

    // 重新构造一个 Set 集合，防止死循环
    const effects = new Set(deps)

    effects.forEach(effect => {
        // 如果当前 effect 等于 activeEffect，则跳过
        if (effect !== activeEffect) {
            triggerEffect(effect)
        }
    })
}

/**
 * 清空依赖
 */
export function cleanupEffect(effect: ReactiveEffect) {
    for (const depSet of effect.depSetList) {
        // 清除上一次旧的依赖
        depSet.delete(effect)
    }
    // 清空依赖集合
    effect.depSetList.length = 0
}

/**
 * 触发指定依赖
 */
export function triggerEffect(effect: ReactiveEffect) {
    // 存在调度器则使用调度器执行
    if (effect.scheduler) {
        effect.scheduler(effect)
    } else {
        effect.run()
    }
}

/**
 * 暂停依赖收集
 */
export function pauseTracking() {
    shouldTrack = false
}

/**
 * 恢复依赖收集
 */
export function resumeTracking() {
    shouldTrack = true
}
