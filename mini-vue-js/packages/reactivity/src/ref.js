import { activeEffect, trackEffects, triggerEffects } from './effect'

export function trackRefValue(refIns) {
  if (activeEffect) {
    const deps = refIns.deps || (refIns.deps = new Set())
    trackEffects(deps)
  }
}

export function triggerRefValue(refIns) {
  triggerEffects(refIns.deps)
}
