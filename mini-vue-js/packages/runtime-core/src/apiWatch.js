import { effect } from '@vue/reactivity'
import { isFunction, isObject } from '@vue/shared'
import { nextTick } from './scheduler'

export function watch(source, cb, options = {}) {
  let getter
  if (isFunction(source)) {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue

  let cleanup

  const onInvalidate = fn => {
    cleanup = fn
  }

  const job = () => {
    newValue = _effect.run()
    if (cleanup) {
      cleanup()
    }
    cb(newValue, oldValue, onInvalidate)
    oldValue = newValue
  }

  const _effect = effect(getter, {
    lazy: true,
    scheduler() {
      if (options.flush === 'post') {
        nextTick(job)
      } else {
        job()
      }
    }
  })

  if (options.immediate) {
    job()
  } else {
    oldValue = _effect.run()
  }
}

function traverse(value, seen = new Set()) {
  if (!isObject(value) || value == null || seen.has(value)) return
  seen.add(value)
  for (const key in value) {
    traverse(value[key], seen)
  }
  return value
}
