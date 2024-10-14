import { extend } from '@vue/shared'

const targetMap = new WeakMap()

// 当前激活的effect实例
let activeEffect = null
const effectStack = []

export function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  // 将依赖集合 deps 加入到当前激活的 effect 函数的 depSetList 中
  activeEffect.depSetList.push(deps)
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  // 重新构造一个 set 集合，防止在执行过程中，发生无线递归
  const effetsToRun = new Set()
  effects &&
    effects.forEach(effect => {
      if (effect !== activeEffect) {
        effetsToRun.add(effect)
      }
    })
  if (effetsToRun) {
    effetsToRun.forEach(effect => {
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        effect.run()
      }
    })
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

class ReactiveEffect {
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
