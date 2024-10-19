import { extend, isArray } from '@vue/shared'
import { TriggerType } from './operations'
import { ITERATE_KEY } from './constants'

const targetMap = new WeakMap()
let shouldTrack = true

export function pauseTracking() {
  shouldTrack = false
}

export function resumeTracking() {
  shouldTrack = true
}

// 当前激活的effect实例
export let activeEffect = null
const effectStack = []

export function track(target, key) {
  if (!shouldTrack || !activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  trackEffects(deps)
}

export function trackEffects(deps) {
  deps.add(activeEffect)
  // 将依赖集合 deps 加入到当前激活的 effect 函数的 depSetList 中
  activeEffect.depSetList.push(deps)
}

export function trigger(target, key, type, newValue) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // 重新构造一个 set 集合，防止在执行过程中，发生无限递归
  const effetsToRun = new Set()

  // 添加当前 key 的所有依赖
  const effects = depsMap.get(key)
  effects && triggerEffects(effects, effetsToRun)

  // 当设置 length 的值小于等于当前数组索引时，则表示删除了某些元素
  // 例如 [1,2,3,4,5] 设置了 length = 3，则删除了 4 和 5，那么  4 和 5 的依赖需要被触发
  if (isArray(target) && key === 'length') {
    depsMap.forEach((effects, key) => {
      // 此时 key 为 index
      if (key >= newValue) {
        triggerEffects(effects, effetsToRun)
      }
    })
  }
  // 只有当触发类型为 ADD 或 DELETE 时，才会触发这个迭代行为的依赖
  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    if (isArray(target)) {
      // 当通过设置过大索引值导致数组长度变化时，手动触发 length 相关依赖
      const lengthEffects = depsMap.get('length')
      lengthEffects && triggerEffects(lengthEffects, effetsToRun)
    } else {
      // 添加 ITERATE_KEY 的依赖
      const iterateEffects = depsMap.get(ITERATE_KEY)
      iterateEffects && triggerEffects(iterateEffects, effetsToRun)
    }
  }
}

/**
 * 批量执行副作用实例
 * @param {Set<object>} effects 即 deps(deps 里面存储的就是一个个 effect 实例)
 * @param {Set<object>} runSet 执行的集合
 * @returns
 */
export function triggerEffects(effects, effetsToRun = new Set()) {
  if (!effects) return

  if (effects) {
    effects.forEach(effect => {
      // 遍历加入时进行边界处理，effect如果是当前正在执行的实例，则无需再添加到新的集合中
      if (effect !== activeEffect) {
        effetsToRun.add(effect)
      }
    })

    if (effetsToRun) {
      effetsToRun.forEach(effect => {
        triggerEffect(effect)
      })
    }
  }
}

/**
 * 处理单个副作用实例
 * @param {object} effect
 */
export function triggerEffect(effect) {
  if (effect.scheduler) {
    effect.scheduler(effect)
  } else {
    effect.run()
  }
}

/**
 * 处理副作用函数
 * @param {Function} fn 副作用函数
 * @param {object} options
 * @param {object} options.lazy 懒加载
 * @param {object} options.scheduler 调度器
 * @returns
 */
export function effect(fn, options = {}) {
  const defaultOptions = {
    lazy: false
  }
  const _options = extend({}, defaultOptions, options)
  const effect = new ReactiveEffect(fn, _options.scheduler)
  effect.run()
  return effect
}

export class ReactiveEffect {
  /**
   * @param {Function} fn
   * @param {Function} scheduler
   */
  constructor(fn, scheduler) {
    // 保存当前的effect函数
    this.fn = fn
    // 存储所有与该副作用函数相关联的依赖关系-便于后续每次执行effect时，清空上一次的依赖关系
    //  - 此数组里面存储的是是一个个 Set 集合
    this.depSetList = []

    if (scheduler) {
      this.scheduler = scheduler
    }
  }

  run() {
    try {
      activeEffect = this
      // 执行前清空旧的依赖
      cleanup(this)
      //压栈-执行副作用函数之前，将当前 effect 实例加入到 effectStack 中
      effectStack.push(this)
      // 得到当前激活的effect函数的返回值
      return this.fn()
    } finally {
      // 出栈-副作用函数执行完成之后，将当前 effect 实例从 effectStack 中移除
      effectStack.pop()
      // 并将 activeEffect 设置为 effectStack 中的最后一个 effect 实例
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
}

/**
 * 清除依赖
 * @param {object} effect 依赖实例
 */
function cleanup(effect) {
  // 遍历 effect 实例上的 deps 属性
  for (let i = 0; i < effect.depSetList.length; i++) {
    // 获取 set
    const depSet = effect.depSetList[i]
    // 从 set 中移除当前 fn
    //  - 这里面的 depSet 存储的不是直接的 fn，而是 effect 实例
    depSet.delete(effect)
  }
  // 清空 effect 实例上的 deps 属性-便于下次执行 effect 函数时，重新收集依赖
  effect.depSetList.length = 0
}
