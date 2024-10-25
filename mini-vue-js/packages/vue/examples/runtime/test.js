// 是否应该收集依赖
let shouldTrack = true

// 暂停收集依赖
function pauseTracking() {
  shouldTrack = false
}

// 恢复收集依赖
function resumeTracking() {
  shouldTrack = true
}

const arrayInstrumentations = {}
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

function track(target, key) {
  // 停止收集依赖期间或者 activeFn 为空，则不收集
  if (!shouldTrack || !activeFn) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let deps = depsMap.get(key)
  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }
  deps.add(activeFn)
  activeFn.deps.push(deps)
}
